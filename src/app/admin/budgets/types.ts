/**
 * Shared types for the Admin → Budgets page (BP-085 Phase 3).
 * Lifted out of the API route module so the client page can import it
 * without dragging server-only modules into the browser bundle.
 */

export interface AdminBudgetRow {
  userId: string;
  email: string | null;
  fullName: string | null;
  tier: string;
  /**
   * Sum of cost_usd for ai_usage_events where source != 'byok' — i.e.
   * what the business actually pays. The kill-switch budget compares
   * against this number; BYOK is excluded because the user pays their
   * own provider account.
   */
  currentMonthBillableUsd: number;
  /**
   * Sum of cost_usd for source = 'byok' — display-only context so admins
   * can see total user activity without those costs counting against the
   * cap. Never used for status, gate, or auto-pause decisions.
   */
  currentMonthByokUsd: number;
  monthlyUsdLimit: number | null;
  isPaused: boolean;
  pausedAt: string | null;
  pausedReason: string | null;
  teamBurnAlertThresholdUsd: number;
  lastAlertAt: string | null;
  lastAlertType: string | null;
}
