/**
 * BP-131 Session 2: User self-serve account deletion.
 *
 * DELETE /api/account
 *   Soft-delete the authenticated caller's account (30-day grace).
 *   Self-deletion is intentionally limited to soft delete — hard
 *   delete is admin-only because it requires more careful handling
 *   (e.g. an admin can confirm there are no active subscriptions or
 *   ToS-related holds before permanently removing the data).
 *
 *   Optional body: { reason?: string }
 *
 * No magic-link / email re-auth in this version — that lands as a
 * follow-up BP once email infrastructure is wired. Today's safeguards:
 *   - Authenticated session required (the user is already logged in).
 *   - Type-"DELETE" confirmation in the dialog (UX-side).
 *   - 30-day soft-delete grace gives a recovery window for any
 *     accidental clicks.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { softDeleteUser } from "@/lib/account/delete-user";

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const admin = createAdminClient();
  const result = await softDeleteUser({
    admin,
    userId: user.id,
    initiatedBy: user.id,
    initiatedByRole: "self",
    reason: body.reason,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
