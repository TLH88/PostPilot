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
  currentMonthUsd: number;
  monthlyUsdLimit: number | null;
  isPaused: boolean;
  pausedAt: string | null;
  pausedReason: string | null;
  teamBurnAlertThresholdUsd: number;
  lastAlertAt: string | null;
  lastAlertType: string | null;
}
