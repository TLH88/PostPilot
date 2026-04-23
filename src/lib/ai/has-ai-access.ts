import type { CreatorProfile } from "@/types";

export type AIAccessStatus = {
  hasAccess: boolean;
  reason: "byok" | "gateway" | "managed_trial" | "managed_admin" | "none";
};

type ProfileSubset = Pick<
  CreatorProfile,
  | "ai_provider"
  | "ai_api_key_encrypted"
  | "force_ai_gateway"
  | "managed_ai_access"
  | "managed_ai_expires_at"
  | "account_status"
  | "trial_ends_at"
>;

function hasManagedAccess(profile: ProfileSubset): AIAccessStatus["reason"] | null {
  if (profile.account_status === "trial" && profile.trial_ends_at) {
    if (new Date(profile.trial_ends_at) > new Date()) return "managed_trial";
  }
  if (profile.managed_ai_access) {
    if (!profile.managed_ai_expires_at) return "managed_admin";
    if (new Date(profile.managed_ai_expires_at) > new Date()) return "managed_admin";
  }
  return null;
}

/**
 * Determine whether a user has working AI access given their profile state.
 *
 * Mirrors (client-safe subset of) the resolution logic in
 * `getUserAIClient()` — but does NOT read secrets. Safe to call in UI code
 * to decide whether to disable AI-dependent CTAs or show a setup warning.
 *
 * The authoritative check still happens server-side in the `/api/ai/*`
 * routes. This is a UX hint only.
 *
 * `gatewayAvailable` should be sourced from a server component
 * (`!!process.env.VERCEL_OIDC_TOKEN || !!process.env.AI_GATEWAY_API_KEY`)
 * and passed down — env vars are never read in the browser.
 */
export function resolveAIAccess(
  profile: ProfileSubset | null | undefined,
  gatewayAvailable: boolean,
  hasProviderKeyInTable = false
): AIAccessStatus {
  if (!profile) return { hasAccess: false, reason: "none" };

  if (profile.force_ai_gateway && gatewayAvailable) {
    return { hasAccess: true, reason: "gateway" };
  }

  if (hasProviderKeyInTable || profile.ai_api_key_encrypted) {
    return { hasAccess: true, reason: "byok" };
  }

  const managed = hasManagedAccess(profile);
  if (managed && gatewayAvailable) {
    return { hasAccess: true, reason: managed };
  }

  return { hasAccess: false, reason: "none" };
}
