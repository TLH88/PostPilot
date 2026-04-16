/**
 * POST /api/posts/approval/submit — submit a post for review
 * POST /api/posts/approval/decide — approve or request changes
 * GET /api/posts/approval?postId=xxx — get approval history
 * BP-050: Configurable Approval Workflow
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { createNotifications, createNotification } from "@/lib/notifications";
import { logApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("post_approvals")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch reviewer names
    const reviewerIds = Array.from(new Set((data ?? []).map((a) => a.reviewer_id)));
    const { data: profiles } = await supabase
      .from("creator_profiles")
      .select("user_id, full_name")
      .in("user_id", reviewerIds.length > 0 ? reviewerIds : [""]);

    const profileMap: Record<string, string> = {};
    for (const p of profiles ?? []) profileMap[p.user_id] = p.full_name ?? "";

    return NextResponse.json({
      approvals: (data ?? []).map((a) => ({ ...a, reviewer_name: profileMap[a.reviewer_id] ?? "Unknown" })),
    });
  } catch (error) {
    logApiError("api/posts/approval GET", error);
    return NextResponse.json({ error: "Failed to load approvals" }, { status: 500 });
  }
}

/**
 * Submit a post for review
 */
export async function POST(request: NextRequest) {
  try {
    const { action, postId, decision, feedback, versionId, reviewers: submitReviewers } = await request.json();
    if (!action || !postId) {
      return NextResponse.json({ error: "action and postId are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: post } = await supabase
      .from("posts")
      .select("id, title, user_id, workspace_id, approval_stage, approval_status, assigned_to")
      .eq("id", postId)
      .single();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    if (action === "submit") {
      // Reviewers: use per-submission reviewers if provided, else fall back to workspace first stage
      let reviewerIds: string[] = [];
      let stageName = "review";

      if (Array.isArray(submitReviewers) && submitReviewers.length > 0) {
        reviewerIds = submitReviewers;
      } else {
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("approval_stages")
          .eq("id", post.workspace_id)
          .single();
        const stages = (workspace?.approval_stages ?? []) as Array<{ name: string; reviewers: string[] }>;
        const firstStage = stages[0];
        if (firstStage) {
          stageName = firstStage.name;
          reviewerIds = firstStage.reviewers ?? [];
        }
      }

      const { error } = await supabase
        .from("posts")
        .update({
          status: "review",
          approval_stage: stageName,
          approval_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
      if (error) throw error;

      await logActivity(supabase, {
        user_id: user.id,
        workspace_id: post.workspace_id,
        post_id: postId,
        action: "post_submitted_for_review",
        details: { stage: stageName, reviewers: reviewerIds },
      });

      // Notify selected reviewers
      if (reviewerIds.length > 0) {
        await createNotifications(supabase, reviewerIds, {
          workspace_id: post.workspace_id,
          type: "approval_request",
          title: "Post awaiting your review",
          body: `"${post.title ?? "Untitled"}" needs ${stageName} approval`,
          action_url: `/posts/${postId}`,
          post_id: postId,
          triggered_by: user.id,
        });
      }

      return NextResponse.json({ success: true, reviewers: reviewerIds });
    }

    if (action === "decide") {
      if (!decision || !["approved", "changes_requested"].includes(decision)) {
        return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
      }

      const { error: insertError } = await supabase.from("post_approvals").insert({
        post_id: postId,
        workspace_id: post.workspace_id,
        stage: post.approval_stage ?? "review",
        reviewer_id: user.id,
        decision,
        feedback: feedback ?? null,
        version_id: versionId ?? null,
      });
      if (insertError) throw insertError;

      // Update post status
      const newStatus = decision === "approved" ? "draft" : "draft"; // approved moves forward, changes_requested goes back to draft
      const newApprovalStatus = decision === "approved" ? "approved" : "changes_requested";

      const { error: updateError } = await supabase
        .from("posts")
        .update({
          status: decision === "approved" ? "draft" : newStatus,
          approval_status: newApprovalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
      if (updateError) throw updateError;

      await logActivity(supabase, {
        user_id: user.id,
        workspace_id: post.workspace_id,
        post_id: postId,
        action: decision === "approved" ? "post_approved" : "post_changes_requested",
        details: { feedback: feedback ?? null, stage: post.approval_stage },
      });

      // Notify post author + assignee
      const toNotify = new Set<string>();
      if (post.user_id && post.user_id !== user.id) toNotify.add(post.user_id);
      if (post.assigned_to && post.assigned_to !== user.id) toNotify.add(post.assigned_to);

      for (const uid of toNotify) {
        await createNotification(supabase, {
          user_id: uid,
          workspace_id: post.workspace_id,
          type: "approval_decision",
          title: decision === "approved" ? "Your post was approved" : "Changes requested on your post",
          body: `"${post.title ?? "Untitled"}"${feedback ? ` — ${feedback}` : ""}`,
          action_url: `/posts/${postId}`,
          post_id: postId,
          triggered_by: user.id,
        });
      }

      return NextResponse.json({ success: true, decision });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    logApiError("api/posts/approval POST", error);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
