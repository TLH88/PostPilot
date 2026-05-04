/**
 * BP-085 Phase 3 follow-up — Manual trigger for the budget evaluator.
 *
 * The hourly pg_cron job runs the evaluator automatically; this endpoint
 * lets an admin force a run on demand from the /admin/budgets page so
 * they can verify their threshold/pause setup without waiting for the
 * next cron tick.
 *
 * Auth: admin-only (verifyAdmin checks ADMIN_EMAILS). This is a separate
 * auth path from the cron route's PG_CRON_JWT_SECRET HMAC, so leaking
 * the cron JWT cannot trigger this surface and vice versa.
 */

import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";
import { evaluateAllManagedUsers } from "@/lib/ai/budget-evaluator";

export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const summary = await evaluateAllManagedUsers();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    logApiError("api/admin/budgets/run-evaluator", error);
    return NextResponse.json({ error: "Evaluator failed" }, { status: 500 });
  }
}
