import { GATED_FEATURES, type SubscriptionTier } from "@/lib/constants";
import { TEAM_FEATURES_ENABLED, isTeamFeatureKey } from "@/lib/feature-flags";

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  creator: 1,
  professional: 2,
  team: 3,
  enterprise: 4,
};

/**
 * Check if a feature is available for the given subscription tier.
 * Returns true if the user's tier meets or exceeds the required tier.
 *
 * BP-098: When TEAM_FEATURES_ENABLED is false, any Team-tier feature key
 * (see TEAM_FEATURE_KEYS in feature-flags.ts) returns false regardless of
 * the user's actual tier. This is the central kill-switch that hides the
 * entire Team-collaboration suite from end users.
 */
export function hasFeature(
  userTier: SubscriptionTier,
  featureKey: string
): boolean {
  // Master flag short-circuit: Team features are globally disabled.
  if (isTeamFeatureKey(featureKey) && !TEAM_FEATURES_ENABLED) {
    return false;
  }

  const requiredTier = GATED_FEATURES[featureKey];
  if (!requiredTier) return true; // not gated
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/**
 * Get the minimum tier required for a feature.
 * Returns null if the feature is not gated.
 */
export function getRequiredTier(
  featureKey: string
): SubscriptionTier | null {
  return GATED_FEATURES[featureKey] ?? null;
}
