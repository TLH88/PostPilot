import { NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();

  // Fetch all workspaces with full details
  const { data: rawWorkspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch all members with profile info
  const { data: allMembers } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, joined_at");

  // Fetch all profiles for names/emails
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, subscription_tier");

  // Fetch auth users for emails
  const { data: authData } = await supabase.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) {
    if (u.email) emailMap[u.id] = u.email;
  }

  const profileMap: Record<string, { full_name: string | null; subscription_tier: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.user_id] = { full_name: p.full_name, subscription_tier: p.subscription_tier };
  }

  // Count posts and ideas per workspace
  const { data: postCounts } = await supabase
    .from("posts")
    .select("workspace_id")
    .not("workspace_id", "is", null);

  const { data: ideaCounts } = await supabase
    .from("ideas")
    .select("workspace_id")
    .not("workspace_id", "is", null);

  const postCountMap: Record<string, number> = {};
  for (const p of postCounts ?? []) {
    if (p.workspace_id) postCountMap[p.workspace_id] = (postCountMap[p.workspace_id] || 0) + 1;
  }

  const ideaCountMap: Record<string, number> = {};
  for (const i of ideaCounts ?? []) {
    if (i.workspace_id) ideaCountMap[i.workspace_id] = (ideaCountMap[i.workspace_id] || 0) + 1;
  }

  // Build enriched workspace list
  const workspaces = (rawWorkspaces ?? []).map((ws) => {
    const members = (allMembers ?? [])
      .filter((m) => m.workspace_id === ws.id)
      .map((m) => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: profileMap[m.user_id]?.full_name ?? null,
        email: emailMap[m.user_id] ?? null,
        subscription_tier: profileMap[m.user_id]?.subscription_tier ?? "free",
      }));

    return {
      ...ws,
      ownerName: profileMap[ws.owner_id]?.full_name ?? "Unknown",
      ownerEmail: emailMap[ws.owner_id] ?? "Unknown",
      memberCount: members.length,
      members,
      postCount: postCountMap[ws.id] ?? 0,
      ideaCount: ideaCountMap[ws.id] ?? 0,
    };
  });

  return NextResponse.json({ workspaces });
}
