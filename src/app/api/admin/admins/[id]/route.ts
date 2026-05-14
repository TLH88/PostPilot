import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

/**
 * Remove an admin from the admin_users table.
 *
 * Safety guard: admins cannot remove themselves. The owner can drop
 * their own row by editing in the DB directly, but the UI flow
 * prevents accidental lock-out.
 *
 * Env-var-bootstrap admins (ADMIN_EMAILS) are not stored in this table
 * and therefore cannot be removed via this endpoint — that's the intent.
 */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Block self-removal — admin must be removed by someone else.
  const { data: target } = await supabase
    .from("admin_users")
    .select("id, email")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }
  if (admin.email && target.email.toLowerCase() === admin.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot remove your own admin access. Ask another admin to do it." },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  console.log(
    JSON.stringify({
      level: "info",
      context: "admin/admins",
      action: "remove",
      adminEmail: admin.email,
      removedAdminEmail: target.email,
      timestamp: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ ok: true });
}
