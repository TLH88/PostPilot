import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";

type Role = "admin" | "editor" | "member" | "viewer";
const VALID_ROLES: Role[] = ["admin", "editor", "member", "viewer"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, email, role = "member" } = await request.json();

    if (!workspaceId || !email) {
      return NextResponse.json({ error: "workspaceId and email are required" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Verify the requesting user is an owner or admin of the workspace
    const { data: currentMember } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!currentMember || !["owner", "admin"].includes(currentMember.role)) {
      return NextResponse.json(
        { error: "Only workspace owners and admins can invite members" },
        { status: 403 }
      );
    }

    // Look up the invitee by email via admin client
    const adminClient = createAdminClient();
    const { data: authData } = await adminClient.auth.admin.listUsers();
    const invitee = (authData?.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!invitee) {
      return NextResponse.json(
        { error: "No PostPilot user found with that email. Ask them to sign up first, then invite again." },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", invitee.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This user is already a workspace member" },
        { status: 409 }
      );
    }

    // Add the invitee as a member
    const { error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: invitee.id,
        role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      invitee: { user_id: invitee.id, email: invitee.email, role },
    });
  } catch (error) {
    logApiError("api/workspace/invite", error);
    const msg = error instanceof Error ? error.message : "Failed to invite member";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
