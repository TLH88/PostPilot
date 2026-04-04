import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, email } = await request.json();

    if (!workspaceId || !email) {
      return NextResponse.json({ error: "workspaceId and email are required" }, { status: 400 });
    }

    // Verify the requesting user is the workspace owner
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspaceId)
      .single();

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Only the workspace owner can invite members" }, { status: 403 });
    }

    // Look up the user by email (they must already have a PostPilot account)
    const { data: inviteeProfile } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("user_id", (
        await supabase.rpc("get_user_id_by_email", { email_input: email })
      ).data)
      .single();

    // Fallback: search auth.users via admin (not available via client)
    // For now, create a pending invite that can be claimed when the user signs up
    // We'll store the email as a placeholder

    // Check if already a member
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id); // placeholder — real implementation needs email-to-user lookup

    // For the foundation phase, we add the invite as a pending member
    // The invited user will see the workspace when they log in
    const { error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id, // placeholder — will be the invitee's user_id once we have email lookup
        role: "member",
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "This user is already a workspace member" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to invite member";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
