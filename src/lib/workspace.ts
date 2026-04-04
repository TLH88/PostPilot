/**
 * Client-side workspace utilities.
 * For server-side workspace queries, use the Supabase server client directly.
 */

const ACTIVE_WORKSPACE_KEY = "postpilot_active_workspace";

/**
 * Get the active workspace ID from localStorage (client-side only).
 * Returns null for personal mode.
 */
export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

/**
 * Set the active workspace ID in localStorage.
 * Pass null to switch to personal mode.
 */
export function setActiveWorkspaceId(workspaceId: string | null): void {
  if (typeof window === "undefined") return;
  if (workspaceId) {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  } else {
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  }
}
