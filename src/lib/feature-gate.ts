import { GATED_FEATURES, type SubscriptionTier } from "@/lib/constants";

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
 */
export function hasFeature(
  userTier: SubscriptionTier,
  featureKey: string
): boolean {
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
