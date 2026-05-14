import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

/**
 * Admin user management. Anyone whose email is in either
 *   - ADMIN_EMAILS env var (bootstrap; can't be removed via UI), or
 *   - public.admin_users table (DB-managed; this endpoint manages it)
 * passes verifyAdmin() and reaches the admin panel.
 */

const createSchema = z.object({
  email: z.string().email().max(255).transform((s) => s.trim().toLowerCase()),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, added_by, added_at, notes")
    .order("added_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Env-var bootstrap admins are surfaced separately so the UI can show
  // them as locked (cannot be removed via this endpoint).
  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return NextResponse.json({
    envAdmins,
    dbAdmins: data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email: parsed.data.email,
      notes: parsed.data.notes ?? null,
      added_by: admin.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `${parsed.data.email} is already an admin` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(
    JSON.stringify({
      level: "info",
      context: "admin/admins",
      action: "add",
      adminEmail: admin.email,
      newAdminEmail: parsed.data.email,
      timestamp: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ admin: data });
}
