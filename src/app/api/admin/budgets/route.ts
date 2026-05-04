/**
 * BP-085 Phase 3 — Admin API: list users with their current-month spend,
 * threshold, paused state, and last-alert timestamp.
 *
 * GET /api/admin/budgets
 * Returns array of rows, one per active user_profiles row.
 *
 * Auth: admin-only (verifyAdmin).
 */

import { NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { currentMonthStart } from "@/lib/ai/budget-check";
import type { AdminBudgetRow } from "@/app/admin/budgets/types";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const periodStart = currentMonthStart().toISOString();

  // Auth users (for emails) + profiles (for tier + name) + thresholds +
  // current-month events + recent alerts. Volumes are admin-scoped.
  const [authRes, profilesRes, thresholdsRes, eventsRes, alertsRes] =
    await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase
        .from("user_profiles")
        .select("user_id, full_name, subscription_tier"),
      supabase
        .from("ai_budget_thresholds")
        .select(
          "user_id, monthly_usd_limit, is_paused, paused_at, paused_reason, team_burn_alert_threshold_usd"
        ),
      supabase
        .from("ai_usage_events")
        .select("user_id, cost_usd")
        .gte("created_at", periodStart),
      supabase
        .from("ai_budget_alerts")
        .select("user_id, alert_type, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }
  if (thresholdsRes.error) {
    return NextResponse.json({ error: thresholdsRes.error.message }, { status: 500 });
  }
  if (eventsRes.error) {
    return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });
  }
  if (alertsRes.error) {
    return NextResponse.json({ error: alertsRes.error.message }, { status: 500 });
  }

  const emailById = new Map<string, string | null>();
  for (const u of authRes.data?.users ?? []) {
    emailById.set(u.id, u.email ?? null);
  }

  const spendByUser = new Map<string, number>();
  for (const e of eventsRes.data ?? []) {
    const uid = e.user_id as string;
    const v = e.cost_usd as number | null;
    if (typeof v === "number" && !Number.isNaN(v)) {
      spendByUser.set(uid, (spendByUser.get(uid) ?? 0) + v);
    }
  }

  const thresholdByUser = new Map<
    string,
    {
      monthly_usd_limit: number | null;
      is_paused: boolean;
      paused_at: string | null;
      paused_reason: string | null;
      team_burn_alert_threshold_usd: number;
    }
  >();
  for (const t of thresholdsRes.data ?? []) {
    thresholdByUser.set(t.user_id as string, {
      monthly_usd_limit: t.monthly_usd_limit as number | null,
      is_paused: !!t.is_paused,
      paused_at: t.paused_at as string | null,
      paused_reason: t.paused_reason as string | null,
      team_burn_alert_threshold_usd:
        typeof t.team_burn_alert_threshold_usd === "number"
          ? (t.team_burn_alert_threshold_usd as number)
          : 30,
    });
  }

  // First alert encountered per user is the most-recent because the query
  // is ordered desc by created_at.
  const lastAlertByUser = new Map<string, { type: string; at: string }>();
  for (const a of alertsRes.data ?? []) {
    const uid = a.user_id as string;
    if (!lastAlertByUser.has(uid)) {
      lastAlertByUser.set(uid, {
        type: a.alert_type as string,
        at: a.created_at as string,
      });
    }
  }

  const rows: AdminBudgetRow[] = (profilesRes.data ?? []).map((p) => {
    const uid = p.user_id as string;
    const t = thresholdByUser.get(uid);
    const lastAlert = lastAlertByUser.get(uid);
    return {
      userId: uid,
      email: emailById.get(uid) ?? null,
      fullName: (p.full_name as string | null) ?? null,
      tier: (p.subscription_tier as string | null) ?? "free",
      currentMonthUsd: spendByUser.get(uid) ?? 0,
      monthlyUsdLimit: t?.monthly_usd_limit ?? null,
      isPaused: t?.is_paused ?? false,
      pausedAt: t?.paused_at ?? null,
      pausedReason: t?.paused_reason ?? null,
      teamBurnAlertThresholdUsd: t?.team_burn_alert_threshold_usd ?? 30,
      lastAlertAt: lastAlert?.at ?? null,
      lastAlertType: lastAlert?.type ?? null,
    };
  });

  // Sort by current-month spend desc — biggest cost concerns first.
  rows.sort((a, b) => b.currentMonthUsd - a.currentMonthUsd);

  return NextResponse.json({ rows });
}
