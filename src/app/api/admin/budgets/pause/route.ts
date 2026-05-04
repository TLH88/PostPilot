/**
 * BP-085 Phase 3 — Admin API: toggle is_paused for a user.
 *
 * Body:
 *   { userId: string,
 *     paused: boolean,        // target state
 *     reason?: string }       // optional context for the pause/unpause
 *
 * Side effect:
 *   When unpausing (paused=false), insert a 'manual_unpause' alert row
 *   so the audit log captures who lifted the pause and when. The actual
 *   spend at unpause time is recorded as actual_usd.
 *
 * Auth: admin-only (verifyAdmin).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { currentMonthSpendUsd, currentMonthStart } from "@/lib/ai/budget-check";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { userId?: string; paused?: boolean; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, paused, reason } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  if (typeof paused !== "boolean") {
    return NextResponse.json({ error: "paused (boolean) required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Upsert with the new pause state. If no threshold row exists, this
  // creates one (with monthly_usd_limit unset / unlimited) so the pause
  // sticks. updated_at always advances.
  const { error: upsertErr } = await supabase
    .from("ai_budget_thresholds")
    .upsert(
      {
        user_id: userId,
        is_paused: paused,
        paused_at: paused ? now : null,
        paused_reason: paused ? reason ?? "manual: paused by admin" : null,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // On unpause, append a manual_unpause alert (audit trail).
  if (!paused) {
    let actual = 0;
    try {
      actual = await currentMonthSpendUsd(userId);
    } catch {
      actual = 0;
    }

    const periodStart = currentMonthStart();
    const periodEnd = new Date(
      Date.UTC(
        periodStart.getUTCFullYear(),
        periodStart.getUTCMonth() + 1,
        1,
        0,
        0,
        0,
        0
      )
    );

    await supabase.from("ai_budget_alerts").insert({
      user_id: userId,
      alert_type: "manual_unpause",
      threshold_usd: null,
      actual_usd: actual,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
