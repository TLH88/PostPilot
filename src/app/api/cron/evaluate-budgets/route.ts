/**
 * BP-085 Phase 3 — Cron entry point: evaluate budgets, fire alerts,
 * auto-pause non-Team users over their monthly USD limit.
 *
 * Auth: same Vercel Cron pattern as /api/cron/cleanup-images — header
 * `Authorization: Bearer <CRON_SECRET>`. Note: the spec mentions a
 * pg_cron / PG_CRON_JWT_SECRET HMAC pattern (used by the Supabase Edge
 * Function `process-account-deletions`). Here the Next API route follows
 * the existing in-app cron convention (CRON_SECRET) so deployment is
 * identical to the one cron route already shipped. Owner can wire
 * pg_cron + JWT later if they prefer; the handler is auth-gated either way.
 *
 * Owner schedules manually (vercel.json or pg_cron) after review — this
 * route does not self-schedule.
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/api-utils";
import { evaluateAllManagedUsers } from "@/lib/ai/budget-evaluator";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expected = process.env.CRON_SECRET;
    if (!expected || authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await evaluateAllManagedUsers();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    logApiError("api/cron/evaluate-budgets", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
