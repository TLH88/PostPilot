/**
 * GET /api/activity — fetch activity log entries for the user's workspace or specific post
 * Query params: workspaceId, postId, limit (default 50)
 * BP-048: Activity Feed
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const postId = searchParams.get("postId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0);

    // BP-088: When the caller filters by workspaceId, verify they're a member
    // of that workspace at the application layer. RLS on activity_log already
    // restricts results to workspaces the user belongs to, but without an
    // explicit check the endpoint silently returns an empty array — confusing
    // for legitimate misconfigurations and useful for membership-probing.
    if (workspaceId) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();
      if (!member) return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
    }

    let query = supabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (postId) {
      query = query.eq("post_id", postId);
    } else if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Default: user's own activity across all workspaces they're in
      query = query.eq("user_id", user.id);
    }

    const { data: entries, error, count } = await query;
    if (error) throw error;

    // Fetch actor profiles
    const userIds = Array.from(new Set((entries ?? []).map((e) => e.user_id)));
    const { data: profiles } = await supabase
      .from("creator_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds.length > 0 ? userIds : [""]);

    const profileMap: Record<string, string> = {};
    for (const p of profiles ?? []) profileMap[p.user_id] = p.full_name ?? "";

    // Fetch post titles for any referenced posts
    const postIds = Array.from(new Set((entries ?? []).map((e) => e.post_id).filter(Boolean) as string[]));
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title")
      .in("id", postIds.length > 0 ? postIds : [""]);

    const postMap: Record<string, string> = {};
    for (const p of posts ?? []) postMap[p.id] = p.title ?? "Untitled";

    return NextResponse.json({
      entries: (entries ?? []).map((e) => ({
        ...e,
        actor_name: profileMap[e.user_id] ?? "Unknown",
        post_title: e.post_id ? postMap[e.post_id] ?? null : null,
      })),
      total: count ?? 0,
    });
  } catch (error) {
    logApiError("api/activity GET", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
