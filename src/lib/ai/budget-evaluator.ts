/**
 * BP-085 Phase 3 — Budget evaluator.
 *
 * Called by the /api/cron/evaluate-budgets route on a schedule. For each
 * user under management:
 *
 *   1. Load tier (user_profiles.subscription_tier) + threshold row.
 *   2. Sum current-month cost_usd across ai_usage_events.
 *   3. If non-Team + monthly_usd_limit set + spend > limit:
 *        - Insert 'threshold_exceeded' alert.
 *        - Set is_paused = true (auto-pause, BP-085 Phase 3).
 *        - Insert 'auto_paused' alert.
 *   4. If Team tier + spend > team_burn_alert_threshold_usd:
 *        - Insert 'team_burn_alert' alert (no auto-pause — Team gets
 *          notification only per BP-123 cost study recommendation #7).
 *
 * Idempotency: only insert alerts if no alert of the same type already
 * exists for this period_start. Prevents duplicate paging on every cron
 * tick once the threshold has fired for the month.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";
import { notifyAdmins } from "@/lib/admin/notify-admins";
import { currentMonthStart } from "./budget-check";

function fmtUsd(v: number | null): string {
  if (v == null) return "$0.00";
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

export type EvaluatorSummary = {
  evaluatedUsers: number;
  thresholdExceeded: number;
  autoPaused: number;
  teamBurnAlerts: number;
  errors: number;
};

interface ThresholdRow {
  user_id: string;
  monthly_usd_limit: number | null;
  is_paused: boolean;
  team_burn_alert_threshold_usd: number;
}

interface ProfileRow {
  user_id: string;
  subscription_tier: string | null;
  full_name: string | null;
}

/**
 * Evaluate a single user. Used by the cron route to limit one user's
 * failure from poisoning the whole batch.
 */
export async function evaluateAndAct(userId: string): Promise<{
  thresholdExceeded: boolean;
  autoPaused: boolean;
  teamBurnAlert: boolean;
}> {
  const supabase = createAdminClient();
  const periodStart = currentMonthStart();
  // period_end = first of next month, in UTC
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

  // Load tier + name from user_profiles, threshold row, and email from auth.users.
  // Email/name are only used to make admin notifications human-readable.
  const [profileRes, thresholdRes, authUserRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("user_id, subscription_tier, full_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("ai_budget_thresholds")
      .select("user_id, monthly_usd_limit, is_paused, team_burn_alert_threshold_usd")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.auth.admin.getUserById(userId),
  ]);

  const profile = (profileRes.data as ProfileRow | null) ?? null;
  const threshold = (thresholdRes.data as ThresholdRow | null) ?? null;
  const userEmail = authUserRes.data?.user?.email ?? null;
  const userLabel = userEmail ?? userId;

  if (!profile) {
    return { thresholdExceeded: false, autoPaused: false, teamBurnAlert: false };
  }
  // Without a threshold row, there's nothing to enforce or alert on.
  if (!threshold) {
    return { thresholdExceeded: false, autoPaused: false, teamBurnAlert: false };
  }

  // Sum current-month BILLABLE spend. BYOK events are user-paid (their
  // own provider key) and must not count toward the kill-switch budget.
  const { data: events, error: eventsErr } = await supabase
    .from("ai_usage_events")
    .select("cost_usd")
    .eq("user_id", userId)
    .gte("created_at", periodStart.toISOString())
    .neq("source", "byok");
  if (eventsErr) throw eventsErr;

  let spend = 0;
  for (const e of events ?? []) {
    const v = e.cost_usd as number | null;
    if (typeof v === "number" && !Number.isNaN(v)) spend += v;
  }

  const tier = profile.subscription_tier ?? "free";
  const isTeam = tier === "team" || tier === "enterprise";

  let thresholdExceeded = false;
  let autoPaused = false;
  let teamBurnAlert = false;

  // Team-burn alert path (alert only — never auto-pause).
  if (isTeam && spend > threshold.team_burn_alert_threshold_usd) {
    const inserted = await insertAlertIfNew(
      userId,
      "team_burn_alert",
      threshold.team_burn_alert_threshold_usd,
      spend,
      periodStart,
      periodEnd
    );
    teamBurnAlert = inserted;

    if (inserted) {
      try {
        await notifyAdmins({
          type: "budget_team_burn",
          title: `Team burn alert: ${userLabel}`,
          body: `${tier} account spent ${fmtUsd(spend)} this month (alert threshold ${fmtUsd(threshold.team_burn_alert_threshold_usd)}). No auto-pause; reach out to onboard BYOK.`,
          actionUrl: "/admin/budgets",
          triggeredBy: userId,
        });
      } catch (err) {
        logApiError(`budget-evaluator:notify-admins:team-burn:${userId}`, err);
      }
    }
  }

  // Per-user threshold path (non-Team only auto-pauses).
  if (
    !isTeam &&
    threshold.monthly_usd_limit != null &&
    spend > threshold.monthly_usd_limit
  ) {
    const insertedThresholdAlert = await insertAlertIfNew(
      userId,
      "threshold_exceeded",
      threshold.monthly_usd_limit,
      spend,
      periodStart,
      periodEnd
    );
    thresholdExceeded = insertedThresholdAlert;

    if (insertedThresholdAlert) {
      try {
        await notifyAdmins({
          type: "budget_threshold_exceeded",
          title: `Budget exceeded: ${userLabel}`,
          body: `${tier} user spent ${fmtUsd(spend)} this month (limit ${fmtUsd(threshold.monthly_usd_limit)}). BYOK costs excluded.`,
          actionUrl: "/admin/budgets",
          triggeredBy: userId,
        });
      } catch (err) {
        logApiError(`budget-evaluator:notify-admins:threshold:${userId}`, err);
      }
    }

    // Auto-pause if not already paused.
    if (!threshold.is_paused) {
      const { error: pauseErr } = await supabase
        .from("ai_budget_thresholds")
        .update({
          is_paused: true,
          paused_at: new Date().toISOString(),
          paused_reason: "auto: monthly USD limit exceeded",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (pauseErr) throw pauseErr;

      const insertedPauseAlert = await insertAlertIfNew(
        userId,
        "auto_paused",
        threshold.monthly_usd_limit,
        spend,
        periodStart,
        periodEnd
      );
      autoPaused = insertedPauseAlert;

      if (insertedPauseAlert) {
        try {
          await notifyAdmins({
            type: "budget_auto_paused",
            title: `Auto-paused: ${userLabel}`,
            body: `AI access paused for ${tier} user — billable spend ${fmtUsd(spend)} exceeded limit ${fmtUsd(threshold.monthly_usd_limit)}.`,
            actionUrl: "/admin/budgets",
            triggeredBy: userId,
          });
        } catch (err) {
          logApiError(`budget-evaluator:notify-admins:auto-paused:${userId}`, err);
        }
      }
    }
  }

  return { thresholdExceeded, autoPaused, teamBurnAlert };
}

/**
 * Insert an alert row only when no alert of this type already exists
 * for this user + period_start. Returns true when the row was inserted.
 */
async function insertAlertIfNew(
  userId: string,
  alertType: "threshold_exceeded" | "auto_paused" | "team_burn_alert" | "manual_unpause",
  thresholdUsd: number | null,
  actualUsd: number,
  periodStart: Date,
  periodEnd: Date
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: existing, error: checkErr } = await supabase
    .from("ai_budget_alerts")
    .select("id")
    .eq("user_id", userId)
    .eq("alert_type", alertType)
    .eq("period_start", periodStart.toISOString())
    .limit(1);
  if (checkErr) throw checkErr;
  if (existing && existing.length > 0) return false;

  const { error: insertErr } = await supabase.from("ai_budget_alerts").insert({
    user_id: userId,
    alert_type: alertType,
    threshold_usd: thresholdUsd,
    actual_usd: actualUsd,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  });
  if (insertErr) throw insertErr;
  return true;
}

/**
 * Evaluate every user under management. Used by the cron route.
 * "Under management" =
 *   - has a row in ai_budget_thresholds with monthly_usd_limit set, OR
 *   - is on Team/Enterprise tier (alert-only path).
 */
export async function evaluateAllManagedUsers(): Promise<EvaluatorSummary> {
  const supabase = createAdminClient();
  const summary: EvaluatorSummary = {
    evaluatedUsers: 0,
    thresholdExceeded: 0,
    autoPaused: 0,
    teamBurnAlerts: 0,
    errors: 0,
  };

  // Users with an explicit threshold row.
  const { data: thresholdUsers, error: thrErr } = await supabase
    .from("ai_budget_thresholds")
    .select("user_id")
    .not("monthly_usd_limit", "is", null);
  if (thrErr) throw thrErr;

  // Users on Team/Enterprise tiers (always candidates for the burn alert).
  const { data: teamUsers, error: teamErr } = await supabase
    .from("user_profiles")
    .select("user_id")
    .in("subscription_tier", ["team", "enterprise"]);
  if (teamErr) throw teamErr;

  const userIds = new Set<string>();
  for (const u of thresholdUsers ?? []) userIds.add(u.user_id as string);
  for (const u of teamUsers ?? []) userIds.add(u.user_id as string);

  for (const userId of userIds) {
    summary.evaluatedUsers++;
    try {
      const r = await evaluateAndAct(userId);
      if (r.thresholdExceeded) summary.thresholdExceeded++;
      if (r.autoPaused) summary.autoPaused++;
      if (r.teamBurnAlert) summary.teamBurnAlerts++;
    } catch (err) {
      summary.errors++;
      logApiError(`budget-evaluator:${userId}`, err);
    }
  }

  return summary;
}
