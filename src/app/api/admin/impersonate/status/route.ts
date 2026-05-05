import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STASH_COOKIE_NAME,
  verifyStash,
} from "@/lib/admin/impersonation-stash";

/**
 * Returns whether the current session is an active impersonation
 * (i.e. the `pp_admin_stash` cookie is present and valid). Used by the
 * banner mounted in the (app) layout.
 */
export async function GET() {
  const cookieStore = await cookies();
  const stash = cookieStore.get(STASH_COOKIE_NAME)?.value;
  const parsed = verifyStash(stash);
  if (!parsed) {
    return NextResponse.json({ isImpersonating: false });
  }
  return NextResponse.json({
    isImpersonating: true,
    adminEmail: parsed.email,
    expiresAt: parsed.expiresAt,
  });
}
