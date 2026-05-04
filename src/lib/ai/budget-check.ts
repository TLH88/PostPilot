/**
 * BP-085 Phase 3 — Per-user $/month budget gate.
 *
 * Sits ALONGSIDE the existing BP-117 quota gate (count-based). This is the
 * second, additive 402 layer: it returns ok:false when either the user's
 * threshold row says is_paused=true OR the sum of their current-month
 * `ai_usage_events.cost_usd` exceeds `monthly_usd_limit`.
 *
 * Defaults:
 *   - No threshold row at all  → unlimited (ok:true).
 *   - monthly_usd_limit IS NULL → unlimited (ok:true).
 *   - is_paused=true            → ok:false reason='paused'.
 *
 * Fail-open posture: if the DB call itself fails we log and allow the
 * request. Authoritative enforcement is via the cron evaluator, not a
 * hot-path side-effect.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";

export type BudgetCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason: "paused" | "over_limit";
      usdSpent: number;
      limit: number | null;
    };

/**
 * Returns the start of the current calendar month in UTC.
 */
export function currentMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Sum of BILLABLE cost_usd for the user across the current calendar month.
 *
 * "Billable" = anything we (the business) actually pay for — system keys
 * and gateway-routed calls. **BYOK events are excluded**: those are paid
 * by the user from their own provider account and have zero cost impact
 * on us, so they must not count toward the per-user kill-switch budget.
 *
 * Successful + failed events count among billable — every API call has a
 * real cost impact even when the user-facing response was an error.
 */
export async function currentMonthSpendUsd(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const start = currentMonthStart().toISOString();

  // Use rpc-friendly select; sum on the client side because PostgREST
  // sum() requires a custom RPC. Volumes are bounded per user/month.
  const { data, error } = await supabase
    .from("ai_usage_events")
    .select("cost_usd")
    .eq("user_id", userId)
    .gte("created_at", start)
    // Exclude BYOK — user-paid; not a business cost; not enforced.
    .neq("source", "byok");

  if (error) throw error;

  let total = 0;
  for (const row of data ?? []) {
    const v = row.cost_usd as number | null;
    if (typeof v === "number" && !Number.isNaN(v)) total += v;
  }
  return total;
}

/**
 * Returns ok:true when:
 *   - no threshold row exists, OR
 *   - is_paused=false AND (monthly_usd_limit is null OR current spend ≤ limit)
 */
export async function checkBudget(userId: string): Promise<BudgetCheckResult> {
  try {
    const supabase = createAdminClient();
    const { data: threshold, error: thresholdErr } = await supabase
      .from("ai_budget_thresholds")
      .select("monthly_usd_limit, is_paused")
      .eq("user_id", userId)
      .maybeSingle();

    if (thresholdErr) throw thresholdErr;

    // No threshold row at all → unlimited / unmonitored.
    if (!threshold) return { ok: true };

    if (threshold.is_paused) {
      // Compute spend so the response carries useful context. Cheap query.
      let spent = 0;
      try {
        spent = await currentMonthSpendUsd(userId);
      } catch {
        spent = 0;
      }
      return {
        ok: false,
        reason: "paused",
        usdSpent: spent,
        limit:
          typeof threshold.monthly_usd_limit === "number"
            ? threshold.monthly_usd_limit
            : null,
      };
    }

    // Unlimited — null limit means "monitored but not capped".
    if (threshold.monthly_usd_limit == null) return { ok: true };

    const spent = await currentMonthSpendUsd(userId);
    if (spent > threshold.monthly_usd_limit) {
      return {
        ok: false,
        reason: "over_limit",
        usdSpent: spent,
        limit: threshold.monthly_usd_limit,
      };
    }
    return { ok: true };
  } catch (err) {
    // Fail-open. Authoritative enforcement is via the cron evaluator
    // setting is_paused=true; this hot-path check is a fast convenience.
    logApiError(`budget-check:${userId}`, err);
    return { ok: true };
  }
}

/**
 * Build the structured 402 body returned to AI route callers when the
 * budget gate fires. Mirrors the shape of the existing quota response so
 * the client can switch on `error` field.
 */
export function buildBudgetExceededBody(result: Extract<BudgetCheckResult, { ok: false }>) {
  return {
    error: "budget_exceeded",
    reason: result.reason,
    usdSpent: result.usdSpent,
    limit: result.limit,
  };
}
