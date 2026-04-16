/**
 * POST /api/posts/assign — assign a post to a team member
 * DELETE /api/posts/assign — unassign a post
 * BP-046: Post Assignment & Ownership
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { logApiError } from "@/lib/api-utils";
import type { Post } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { postId, assigneeId } = await request.json();
    if (!postId || !assigneeId) {
      return NextResponse.json({ error: "postId and assigneeId are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch post + check access
    const { data: post } = await supabase
      .from("posts")
      .select("id, workspace_id, title, user_id, assigned_to")
      .eq("id", postId)
      .single();

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Must be in the workspace
    if (post.workspace_id) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", post.workspace_id)
        .eq("user_id", user.id)
        .single();
      if (!member) return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
    } else if (post.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Assign
    const { error } = await supabase
      .from("posts")
      .update({
        assigned_to: assigneeId,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (error) throw error;

    // Log activity + notify assignee
    await logActivity(supabase, {
      user_id: user.id,
      workspace_id: post.workspace_id,
      post_id: postId,
      action: "post_assigned",
      details: { assignee_id: assigneeId, previous_assignee: (post as Post).assigned_to },
    });

    if (assigneeId !== user.id) {
      await createNotification(supabase, {
        user_id: assigneeId,
        workspace_id: post.workspace_id,
        type: "assignment",
        title: "You were assigned a post",
        body: `"${(post as Post).title ?? "Untitled"}"`,
        action_url: `/posts/${postId}`,
        post_id: postId,
        triggered_by: user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/posts/assign", error);
    return NextResponse.json({ error: "Failed to assign post" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: post } = await supabase.from("posts").select("workspace_id").eq("id", postId).single();

    const { error } = await supabase
      .from("posts")
      .update({
        assigned_to: null,
        assigned_by: null,
        assigned_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (error) throw error;

    await logActivity(supabase, {
      user_id: user.id,
      workspace_id: post?.workspace_id ?? null,
      post_id: postId,
      action: "post_unassigned",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/posts/assign", error);
    return NextResponse.json({ error: "Failed to unassign post" }, { status: 500 });
  }
}
