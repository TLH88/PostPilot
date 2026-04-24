/**
 * GET /api/workspace/members?workspaceId=xxx — list members with profiles
 * PATCH /api/workspace/members — change a member's role
 * DELETE /api/workspace/members?workspaceId=xxx&userId=yyy — remove a member
 * BP-024 support: used by assignment dropdowns, mention autocomplete, reviewer pickers
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify user is a member
    const { data: currentMember } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    if (!currentMember) return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: members, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId);
    if (error) throw error;

    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, headline")
      .in("user_id", userIds.length > 0 ? userIds : [""]);

    const profileMap: Record<string, { full_name: string | null; headline: string | null }> = {};
    for (const p of profiles ?? []) profileMap[p.user_id] = { full_name: p.full_name, headline: p.headline };

    return NextResponse.json({
      members: (members ?? []).map((m) => ({
        ...m,
        full_name: profileMap[m.user_id]?.full_name ?? null,
        headline: profileMap[m.user_id]?.headline ?? null,
      })),
      current_role: currentMember.role,
    });
  } catch (error) {
    logApiError("api/workspace/members GET", error);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { workspaceId, userId, role } = await request.json();
    if (!workspaceId || !userId || !role) {
      return NextResponse.json({ error: "workspaceId, userId, and role are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only owner or admin can change roles
    const { data: currentMember } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    if (!currentMember || !["owner", "admin"].includes(currentMember.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/workspace/members PATCH", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const userId = searchParams.get("userId");
    if (!workspaceId || !userId) {
      return NextResponse.json({ error: "workspaceId and userId are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: currentMember } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    // Allow self-removal, or owner/admin removing others
    if (!currentMember) return NextResponse.json({ error: "Not a member" }, { status: 403 });
    if (userId !== user.id && !["owner", "admin"].includes(currentMember.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/workspace/members DELETE", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
