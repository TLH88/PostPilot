/**
 * Client-side workspace utilities.
 * The active workspace is stored in both localStorage (for client reads)
 * and a cookie (for server component reads).
 */

export const ACTIVE_WORKSPACE_KEY = "postpilot_active_workspace";
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * Get the active workspace ID (client-side only).
 * Returns null for personal mode.
 */
export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

/**
 * Set the active workspace ID. Writes to both localStorage (for client)
 * and a cookie (for server components to read).
 * Pass null to switch to personal mode.
 */
export function setActiveWorkspaceId(workspaceId: string | null): void {
  if (typeof window === "undefined") return;
  if (workspaceId) {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    document.cookie = `${ACTIVE_WORKSPACE_KEY}=${encodeURIComponent(workspaceId)}; path=/; max-age=${COOKIE_MAX_AGE_DAYS * 86400}; SameSite=Lax`;
  } else {
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    document.cookie = `${ACTIVE_WORKSPACE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * Apply workspace scoping to a Supabase query on a table with user_id + workspace_id columns.
 *
 * Individual mode (no active workspace):
 *   - Returns only items where workspace_id IS NULL AND user_id = current_user
 *   - Users never see workspace-scoped content while in individual mode
 *
 * Workspace mode:
 *   - Returns only items where workspace_id = active_workspace_id
 *   - All workspace members see the same items regardless of who created them
 *
 * Returns the mutated query builder (typed loosely as `any` to avoid deep
 * generic recursion issues with Supabase's internal types).
 *
 * ── Usage rules (BP-095 audit, 2026-04-16) ──
 *
 * USE applyWorkspaceFilter for:
 *   - LIST queries on `posts` and `ideas` from the user-facing app
 *     (dashboard, ideas, posts, calendar, analytics). These need the
 *     individual-vs-workspace mode split or they leak content across modes.
 *
 * DON'T USE applyWorkspaceFilter for:
 *   - Single-row reads/writes by primary key (e.g. .eq("id", postId).single()).
 *     RLS already enforces workspace membership / ownership at the row level.
 *   - Admin routes (e.g. /api/admin/users, /api/admin/workspaces) — these are
 *     intentionally cross-tenant operational queries.
 *   - Background jobs / Edge Functions running with service-role keys —
 *     they don't have a user context.
 *   - Notification, comment, activity, approval helpers — those tables have
 *     their own RLS policies that handle workspace membership directly.
 *
 * If you add a new user-facing LIST query on `posts` or `ideas`, USE THIS
 * HELPER. The lib/workspace-server.ts variant exists for server components
 * that need to read the active workspace from the request cookies.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyWorkspaceFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  userId: string,
  activeWorkspaceId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (activeWorkspaceId) {
    return query.eq("workspace_id", activeWorkspaceId);
  }
  return query.is("workspace_id", null).eq("user_id", userId);
}
