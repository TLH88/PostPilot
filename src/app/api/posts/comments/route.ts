/**
 * GET /api/posts/comments?postId=xxx — list comments for a post
 * POST /api/posts/comments — create a comment (with optional @mentions)
 * PATCH /api/posts/comments — resolve/unresolve a comment
 * DELETE /api/posts/comments?id=xxx — delete a comment
 * BP-047: In-App Comments on Posts
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

    const { data: comments, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch author profiles for display
    const userIds = Array.from(new Set((comments ?? []).map((c) => c.user_id)));
    const { data: profiles } = await supabase
      .from("creator_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds.length > 0 ? userIds : [""]);

    const profileMap: Record<string, string> = {};
    for (const p of profiles ?? []) profileMap[p.user_id] = p.full_name ?? "";

    return NextResponse.json({
      comments: (comments ?? []).map((c) => ({ ...c, author_name: profileMap[c.user_id] ?? "Unknown" })),
    });
  } catch (error) {
    logApiError("api/posts/comments GET", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { postId, content, parentId, mentions } = await request.json();
    if (!postId || !content?.trim()) {
      return NextResponse.json({ error: "postId and content are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: post } = await supabase
      .from("posts")
      .select("id, title, workspace_id, user_id, assigned_to")
      .eq("id", postId)
      .single();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const { data: comment, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        workspace_id: post.workspace_id,
        parent_id: parentId ?? null,
        content: content.trim(),
        mentions: mentions ?? [],
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, {
      user_id: user.id,
      workspace_id: post.workspace_id,
      post_id: postId,
      action: "post_commented",
      details: { comment_id: comment.id },
    });

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      await createNotifications(supabase, mentions, {
        workspace_id: post.workspace_id,
        type: "mention",
        title: "You were mentioned in a comment",
        body: `"${post.title ?? "Untitled"}"`,
        action_url: `/posts/${postId}`,
        post_id: postId,
        triggered_by: user.id,
      });
    }

    // Notify post owner and assignee (unless they're the commenter or already mentioned)
    const mentionSet = new Set(mentions ?? []);
    const toNotify = new Set<string>();
    if (post.user_id && post.user_id !== user.id && !mentionSet.has(post.user_id)) toNotify.add(post.user_id);
    if (post.assigned_to && post.assigned_to !== user.id && !mentionSet.has(post.assigned_to)) toNotify.add(post.assigned_to);

    for (const uid of toNotify) {
      await createNotification(supabase, {
        user_id: uid,
        workspace_id: post.workspace_id,
        type: "comment",
        title: "New comment on a post",
        body: `"${post.title ?? "Untitled"}"`,
        action_url: `/posts/${postId}`,
        post_id: postId,
        triggered_by: user.id,
      });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    logApiError("api/posts/comments POST", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, resolved } = await request.json();
    if (!id || typeof resolved !== "boolean") {
      return NextResponse.json({ error: "id and resolved are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // BP-088: Application-layer authorization mirrors the RLS policy
    // (see 20260417_add_team_features.sql) — only the comment author or a
    // workspace owner/admin can resolve/unresolve. RLS would block the update
    // anyway, but explicit checks return a clear 403 instead of a silent
    // zero-row update.
    const { data: comment } = await supabase
      .from("post_comments")
      .select("user_id, workspace_id")
      .eq("id", id)
      .single();

    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    let allowed = comment.user_id === user.id;
    if (!allowed && comment.workspace_id) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", comment.workspace_id)
        .eq("user_id", user.id)
        .single();
      allowed = !!member && ["owner", "admin"].includes(member.role);
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("post_comments")
      .update({
        resolved,
        resolved_by: resolved ? user.id : null,
        resolved_at: resolved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/posts/comments PATCH", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("post_comments").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/posts/comments DELETE", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
