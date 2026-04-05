import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();

  // Fetch all auth users
  const { data: authData } = await supabase.auth.admin.listUsers();
  const authUsers = authData?.users ?? [];

  // Fetch all creator profiles
  const { data: profiles } = await supabase
    .from("creator_profiles")
    .select("user_id, full_name, subscription_tier, managed_ai_access, managed_ai_expires_at, onboarding_completed, ai_provider, ai_api_key_encrypted, created_at, updated_at")
    .order("created_at", { ascending: false });

  // Fetch users with personal API keys
  const { data: providerKeys } = await supabase
    .from("ai_provider_keys")
    .select("user_id");

  const usersWithKeys = new Set((providerKeys ?? []).map((k) => k.user_id));

  // Fetch per-user stats in bulk
  const { data: postCounts } = await supabase
    .from("posts")
    .select("user_id, status");

  const { data: ideaCounts } = await supabase
    .from("ideas")
    .select("user_id");

  const { data: quotas } = await supabase
    .from("usage_quotas")
    .select("user_id, posts_created, brainstorms_used, chat_messages_used, scheduled_posts, period_start")
    .order("period_start", { ascending: false });

  // Aggregate stats per user
  const userStats: Record<string, {
    totalPosts: number;
    postedPosts: number;
    draftPosts: number;
    totalIdeas: number;
    currentQuota: { posts: number; brainstorms: number; chatMessages: number; scheduled: number } | null;
  }> = {};

  for (const post of postCounts ?? []) {
    if (!userStats[post.user_id]) {
      userStats[post.user_id] = { totalPosts: 0, postedPosts: 0, draftPosts: 0, totalIdeas: 0, currentQuota: null };
    }
    userStats[post.user_id].totalPosts++;
    if (post.status === "posted" || post.status === "archived") userStats[post.user_id].postedPosts++;
    if (post.status === "draft") userStats[post.user_id].draftPosts++;
  }

  for (const idea of ideaCounts ?? []) {
    if (!userStats[idea.user_id]) {
      userStats[idea.user_id] = { totalPosts: 0, postedPosts: 0, draftPosts: 0, totalIdeas: 0, currentQuota: null };
    }
    userStats[idea.user_id].totalIdeas++;
  }

  // Get current month quota per user (most recent period)
  const seenQuotaUsers = new Set<string>();
  for (const q of quotas ?? []) {
    if (seenQuotaUsers.has(q.user_id)) continue;
    seenQuotaUsers.add(q.user_id);
    if (!userStats[q.user_id]) {
      userStats[q.user_id] = { totalPosts: 0, postedPosts: 0, draftPosts: 0, totalIdeas: 0, currentQuota: null };
    }
    userStats[q.user_id].currentQuota = {
      posts: q.posts_created,
      brainstorms: q.brainstorms_used,
      chatMessages: q.chat_messages_used,
      scheduled: q.scheduled_posts,
    };
  }

  // Fetch workspace memberships to show company/team names
  const { data: allMembers } = await supabase
    .from("workspace_members")
    .select("user_id, workspace_id");

  const { data: allWorkspaces } = await supabase
    .from("workspaces")
    .select("id, name");

  const wsNameMap: Record<string, string> = {};
  for (const ws of allWorkspaces ?? []) wsNameMap[ws.id] = ws.name;

  const userWorkspaceIds: Record<string, { id: string; name: string }[]> = {};
  for (const m of allMembers ?? []) {
    if (!userWorkspaceIds[m.user_id]) userWorkspaceIds[m.user_id] = [];
    const name = wsNameMap[m.workspace_id];
    if (name) userWorkspaceIds[m.user_id].push({ id: m.workspace_id, name });
  }

  // Merge auth users with profiles, stats, and workspaces
  const users = authUsers.map((authUser) => {
    const profile = profiles?.find((p) => p.user_id === authUser.id);
    const stats = userStats[authUser.id] ?? { totalPosts: 0, postedPosts: 0, draftPosts: 0, totalIdeas: 0, currentQuota: null };
    const hasPersonalKey = usersWithKeys.has(authUser.id) || !!profile?.ai_api_key_encrypted;
    return {
      id: authUser.id,
      email: authUser.email,
      lastSignIn: authUser.last_sign_in_at,
      createdAt: authUser.created_at,
      workspaces: userWorkspaceIds[authUser.id] ?? [],
      hasPersonalKey,
      stats,
      ...profile,
      ai_api_key_encrypted: undefined, // don't expose to frontend
    };
  });

  // Return all workspaces for assignment dropdowns
  const workspaceList = (allWorkspaces ?? []).map((ws) => ({ id: ws.id, name: ws.name }));

  return NextResponse.json({ users, workspaces: workspaceList });
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, updates } = await request.json();
  if (!userId || !updates) {
    return NextResponse.json({ error: "userId and updates required" }, { status: 400 });
  }

  // Whitelist allowed fields
  const allowed = ["subscription_tier", "managed_ai_access", "managed_ai_expires_at"];
  const safeUpdates: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) safeUpdates[key] = val;
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  safeUpdates.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("creator_profiles")
    .update(safeUpdates)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, userId, workspaceId } = await request.json();

  if (!userId || !workspaceId) {
    return NextResponse.json({ error: "userId and workspaceId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (action === "add_to_workspace") {
    const { error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: "member",
        invited_by: admin.id,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "User is already in this workspace" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "remove_from_workspace") {
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
