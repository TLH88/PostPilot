/**
 * BP-130: Admin read for the tier waitlist.
 *
 * GET /api/admin/waitlist
 *   List all waitlist entries, newest first. Service-role + admin-gated.
 *
 * PATCH /api/admin/waitlist
 *   { id, contacted_at?, notes? } — mark a row as contacted, attach notes.
 *   Used by the admin to track outreach progress.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tier_waitlist")
    .select("id, email, tier, message, ip_address, created_at, contacted_at, notes")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  contacted_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.contacted_at !== undefined) updates.contacted_at = body.contacted_at;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tier_waitlist")
    .update(updates)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
