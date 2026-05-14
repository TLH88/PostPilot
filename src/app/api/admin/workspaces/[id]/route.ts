import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

/**
 * Admin: delete a workspace.
 *
 * Two strategies driven by `action`:
 *   - 'cascade'  → null out content references (posts/ideas/content_library/
 *     post_templates), then delete the workspace. workspace_members is
 *     cascade-deleted by FK. Users lose membership but keep their content
 *     (de-associated from any workspace).
 *   - 'reassign' → move members + content to `targetWorkspaceId`, then
 *     delete the source workspace. Members already in target are skipped
 *     (ON CONFLICT). Content moves wholesale.
 *
 * Operations are sequential — if the DB enforced atomicity here we'd wrap
 * in an RPC, but the admin is in-the-loop and any partial failure is
 * recoverable manually. Each step uses service-role to bypass RLS.
 */

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cascade") }),
  z.object({
    action: z.literal("reassign"),
    targetWorkspaceId: z.string().uuid(),
  }),
]);

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: sourceId } = await params;
  if (!sourceId) {
    return NextResponse.json({ error: "Missing workspace id" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Verify source exists
  const { data: source } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", sourceId)
    .maybeSingle();
  if (!source) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (parsed.data.action === "reassign") {
    const targetId = parsed.data.targetWorkspaceId;
    if (targetId === sourceId) {
      return NextResponse.json(
        { error: "Target workspace must be different from source" },
        { status: 400 },
      );
    }

    const { data: target } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", targetId)
      .maybeSingle();
    if (!target) {
      return NextResponse.json(
        { error: "Target workspace not found" },
        { status: 404 },
      );
    }

    // Move members. Use upsert on (workspace_id, user_id) UNIQUE so
    // already-in-target members are no-ops. Owner of source becomes a
    // regular member of target if not already.
    const { data: sourceMembers } = await supabase
      .from("workspace_members")
      .select("user_id, role, invited_by")
      .eq("workspace_id", sourceId);

    const { data: sourceWs } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", sourceId)
      .single();

    const memberRows = (sourceMembers ?? []).map((m) => ({
      workspace_id: targetId,
      user_id: m.user_id,
      role: m.role === "owner" ? "member" : m.role, // demote source owner if reassigning
      invited_by: admin.id,
      joined_at: new Date().toISOString(),
    }));

    // Also ensure the source owner becomes a target member if not already
    if (sourceWs?.owner_id && !memberRows.some((r) => r.user_id === sourceWs.owner_id)) {
      memberRows.push({
        workspace_id: targetId,
        user_id: sourceWs.owner_id,
        role: "member",
        invited_by: admin.id,
        joined_at: new Date().toISOString(),
      });
    }

    if (memberRows.length > 0) {
      const { error: insertErr } = await supabase
        .from("workspace_members")
        .upsert(memberRows, { onConflict: "workspace_id,user_id", ignoreDuplicates: true });
      if (insertErr) {
        return NextResponse.json(
          { error: "Failed to reassign members", details: insertErr.message },
          { status: 500 },
        );
      }
    }

    // Move content
    for (const table of ["posts", "ideas", "content_library", "post_templates"] as const) {
      const { error: updErr } = await supabase
        .from(table)
        .update({ workspace_id: targetId })
        .eq("workspace_id", sourceId);
      if (updErr) {
        return NextResponse.json(
          { error: `Failed to reassign ${table}`, details: updErr.message },
          { status: 500 },
        );
      }
    }
  } else {
    // cascade: null out content references so the FK doesn't block the
    // delete. workspace_members FK cascade-deletes on workspace delete.
    for (const table of ["posts", "ideas", "content_library", "post_templates"] as const) {
      const { error: updErr } = await supabase
        .from(table)
        .update({ workspace_id: null })
        .eq("workspace_id", sourceId);
      if (updErr) {
        return NextResponse.json(
          { error: `Failed to clear ${table}.workspace_id`, details: updErr.message },
          { status: 500 },
        );
      }
    }
  }

  const { error: deleteErr } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", sourceId);
  if (deleteErr) {
    return NextResponse.json(
      { error: "Failed to delete workspace", details: deleteErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    deletedWorkspaceId: sourceId,
    deletedName: source.name,
    action: parsed.data.action,
  });
}
