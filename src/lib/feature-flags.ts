/**
 * Master feature flags for PostPilot.
 *
 * BP-098: Team Features Master Feature Flag
 *
 * Strategic context (2026-04-16): The Team-collaboration suite (BP-023, BP-046–051,
 * BP-087) shipped before billing infrastructure was in place. To validate the
 * Free→Pro experience first, all Team-tier UI is hidden behind this single flag.
 * The code remains in the repo; only the user-facing surface is dark.
 *
 * Set NEXT_PUBLIC_TEAM_FEATURES_ENABLED=true to restore the Team experience.
 * When unset or "false", all Team-tier features are hidden everywhere:
 *   - Sidebar / mobile nav items (Activity, Reviews)
 *   - Top-bar notifications bell
 *   - Workspace switcher
 *   - Onboarding "Brand/Team" option
 *   - Post-editor team blocks (assignment, comments, activity, approvals)
 *   - Routes /workspace/*, /notifications, /activity (middleware redirect)
 *
 * Database tables, API routes, and migrations are NOT removed. They sit inert
 * and reactivate the moment the flag flips back on.
 */

export const TEAM_FEATURES_ENABLED =
  process.env.NEXT_PUBLIC_TEAM_FEATURES_ENABLED === "true";

/**
 * Post Templates feature flag.
 *
 * Owner direction 2026-05-04: Post Templates are entirely suppressed
 * until GTM. The feature lives in code (template picker, save-as-template
 * dialog, library section, help docs) but is gated off everywhere via
 * this flag. Re-enable post-GTM by flipping to `true`. No env var — this
 * is a temporary product decision, not a per-environment toggle.
 *
 * NOTE: BP-028 "enhancement templates" (the Enhance dropdown's add-hook,
 * story-driven, etc. options under `src/lib/ai/enhancement-templates.ts`
 * and `/api/ai/enhance`) are a SEPARATE concept from Post Templates.
 * They remain enabled and untouched by this flag.
 */
export const POST_TEMPLATES_ENABLED = false;

/**
 * Feature keys (from GATED_FEATURES in constants.ts) that are part of the
 * Team-tier collaboration suite. When TEAM_FEATURES_ENABLED is false,
 * hasFeature() returns false for any key in this list, regardless of the
 * user's actual subscription tier.
 *
 * Keep this list in sync with the "team" entries in GATED_FEATURES.
 */
export const TEAM_FEATURE_KEYS: readonly string[] = [
  "workspaces",
  "brand_onboarding",
  "review_status",
] as const;

/**
 * Routes that are part of the Team-tier surface. The middleware redirects
 * these routes to /dashboard when TEAM_FEATURES_ENABLED is false.
 */
export const TEAM_ROUTE_PREFIXES: readonly string[] = [
  "/workspace",
  "/notifications",
  "/activity",
] as const;

/**
 * Convenience helper: returns true if a given feature key is one of the
 * Team-suite keys (and therefore subject to the master flag).
 */
export function isTeamFeatureKey(featureKey: string): boolean {
  return TEAM_FEATURE_KEYS.includes(featureKey);
}

/**
 * Convenience helper: returns true if the given pathname starts with any
 * of the Team-route prefixes.
 */
export function isTeamRoute(pathname: string): boolean {
  return TEAM_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
