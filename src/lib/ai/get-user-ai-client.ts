import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import {
  createAIClient,
  createGatewayClient,
  getDefaultModel,
  type AIClient,
  type AIProvider,
} from "./providers";
import { getSystemAIDefaults, bucketForTier, type AIKind } from "./system-defaults";
import { hasFeature } from "@/lib/feature-gate";
import type { SubscriptionTier } from "@/lib/constants";
import type { UserProfile } from "@/types";

// System-level API keys for managed/trial access (env vars, never exposed to browser)
const SYSTEM_AI_KEYS: Partial<Record<AIProvider, string | undefined>> = {
  openai: process.env.SYSTEM_AI_KEY_OPENAI,
  anthropic: process.env.SYSTEM_AI_KEY_ANTHROPIC,
  google: process.env.SYSTEM_AI_KEY_GOOGLE,
  perplexity: process.env.SYSTEM_AI_KEY_PERPLEXITY,
};

/**
 * Check if a user has valid managed AI access (system-key path).
 * Access is granted if:
 * 1. account_status = 'active' (Subscription Model v2 default — every
 *    active user gets system AI access within their tier's quotas), OR
 * 2. account_status = 'trial' with trial_ends_at in the future, OR
 * 3. legacy managed_ai_access flag is set and not expired (admin override).
 *
 * Suspended / churned / deleted accounts do NOT get system AI access.
 */
function hasManagedAccess(profile: UserProfile): boolean {
  // Active subscription → system AI access (subject to BP-117 quotas).
  if (profile.account_status === "active") return true;

  // Active trial.
  if (profile.account_status === "trial" && profile.trial_ends_at) {
    if (new Date(profile.trial_ends_at) > new Date()) return true;
  }

  // Legacy admin-granted access (for accounts not in active/trial state,
  // e.g. an admin extending access to a churned user).
  if (!profile.managed_ai_access) return false;
  if (!profile.managed_ai_expires_at) return true;
  return new Date(profile.managed_ai_expires_at) > new Date();
}

/**
 * Get a system-level API key for the given provider, if available.
 */
function getSystemKey(provider: AIProvider): string | null {
  return SYSTEM_AI_KEYS[provider] ?? null;
}

export type AISource = "gateway" | "byok" | "system_key";

export interface UserAIContext {
  client: AIClient;
  profile: UserProfile;
  source: AISource;
  provider: AIProvider;
  model: string;
}

/**
 * Get the AI client for a specific provider (or the active one).
 * Reads keys from ai_provider_keys table first, falls back to user_profiles.
 */
export async function getUserAIClient(
  forProvider?: AIProvider
): Promise<UserAIContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Please complete your profile first");
  }

  const userProfile = profile as UserProfile;

  // Candidate provider for BYOK check: caller's explicit pick, or the user's
  // own preference. For system-key fallback we'll override with the admin
  // default below.
  const byokCandidateProvider = forProvider || (userProfile.ai_provider as AIProvider);

  // Gateway is available if either OIDC (preferred, project-attributed) or the
  // team-scoped API key is configured.
  const gatewayAvailable =
    !!process.env.VERCEL_OIDC_TOKEN || !!process.env.AI_GATEWAY_API_KEY;

  // ─── BYOK resolution ──────────────────────────────────────────────────
  // Force-gateway toggle bypasses BYOK keys entirely (testing/dev override),
  // so we treat it like "no BYOK" and fall through to system defaults.
  const forceGateway = userProfile.force_ai_gateway && gatewayAvailable;

  // BP-125: tier-gating — Free and Personal are system-key only regardless
  // of whether BYOK keys are on file. A user who configured BYOK during a
  // Pro trial retains the keys in storage but they're inert on lower tiers.
  // During an active trial the subscription_tier column is flipped to the
  // trial tier, so trial users pass this check naturally.
  const tier = (userProfile.subscription_tier as SubscriptionTier) ?? "free";
  const byokAllowedForTier = hasFeature(tier, "byok_ai_keys");

  let providerKey: { api_key_encrypted: string; api_key_iv: string; api_key_auth_tag: string } | null = null;
  if (!forceGateway && byokAllowedForTier) {
    const { data } = await supabase
      .from("ai_provider_keys")
      .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
      .eq("user_id", user.id)
      .eq("provider", byokCandidateProvider)
      .single();
    providerKey = data;
  }

  const hasLegacyKey =
    !forceGateway &&
    byokAllowedForTier &&
    userProfile.ai_api_key_encrypted &&
    userProfile.ai_api_key_iv &&
    userProfile.ai_api_key_auth_tag &&
    userProfile.ai_provider === byokCandidateProvider;

  const hasBYOK = !!(providerKey || hasLegacyKey);

  // ─── BYOK path: user's provider + user's model ────────────────────────
  if (hasBYOK) {
    let apiKey: string;
    if (providerKey) {
      apiKey = decrypt({
        ciphertext: providerKey.api_key_encrypted,
        iv: providerKey.api_key_iv,
        authTag: providerKey.api_key_auth_tag,
      });
    } else {
      // legacy single-key on user_profiles
      apiKey = decrypt({
        ciphertext: userProfile.ai_api_key_encrypted!,
        iv: userProfile.ai_api_key_iv!,
        authTag: userProfile.ai_api_key_auth_tag!,
      });
    }
    const byokModel = userProfile.ai_model || getDefaultModel(byokCandidateProvider);
    const client = createAIClient(byokCandidateProvider, apiKey, byokModel);
    return {
      client,
      profile: userProfile,
      source: "byok",
      provider: byokCandidateProvider,
      model: byokModel,
    };
  }

  // ─── System-key path: admin-configured default provider + model ───────
  if (!hasManagedAccess(userProfile)) {
    throw new Error(
      `No API key configured for ${byokCandidateProvider}. Please add your API key in Settings.`
    );
  }

  // For image gen routes the caller passes forProvider explicitly — use
  // image-kind defaults so admin-configured image models flow through.
  // For text routes we leave forProvider undefined and use text defaults.
  const kind: AIKind = forProvider === "openai" || forProvider === "google" ? "image" : "text";
  const systemDefaults = await getSystemAIDefaults({
    tier: bucketForTier(userProfile.subscription_tier),
    kind,
  });
  // Callers that specify forProvider (e.g. image gen) honor that for the
  // provider; system defaults' model still applies when we're in image
  // mode so admin-picked image model is used.
  const systemProvider = forProvider || systemDefaults.provider;
  const systemModel = kind === "image"
    ? systemDefaults.model
    : forProvider
      ? getDefaultModel(forProvider)
      : systemDefaults.model;

  // Prefer Vercel AI Gateway (gateway source), fall back to direct system keys.
  if (gatewayAvailable) {
    const reason = forceGateway ? "FORCED" : "managed";
    console.log(`[AI Gateway] ${reason} ${systemProvider}/${systemModel} via Vercel AI Gateway`);
    const client = createGatewayClient(systemProvider, systemModel);
    return {
      client,
      profile: userProfile,
      source: "gateway",
      provider: systemProvider,
      model: systemModel,
    };
  }

  const systemKey = getSystemKey(systemProvider);
  if (!systemKey) {
    throw new Error(
      `No API key configured for ${systemProvider}. Please add your API key in Settings.`
    );
  }
  console.log(`[Direct] Using system key for ${systemProvider}/${systemModel}`);
  const client = createAIClient(systemProvider, systemKey, systemModel);
  return {
    client,
    profile: userProfile,
    source: "system_key",
    provider: systemProvider,
    model: systemModel,
  };
}

/**
 * Resolve a BYOK-only AI client. Used by Advanced Insights and any other
 * feature that MUST bill the user's own provider account regardless of
 * the system-AI toggles.
 *
 * Differences from `getUserAIClient`:
 *  - Ignores `force_ai_gateway` (Advanced Insights never routes through
 *    the gateway, even when the user has the system-AI slider on).
 *  - Never falls back to the system key. If no BYOK key is on file, the
 *    function throws `BYOK_REQUIRED` so the caller can return a 402 with
 *    a structured "configure your key" payload.
 *  - Still enforces the tier gate (`byok_ai_keys`).
 *
 * Throws Error with `.code` set to one of:
 *   - `UNAUTHORIZED`   — no signed-in user
 *   - `NO_PROFILE`     — profile row missing
 *   - `TIER_GATE`      — tier doesn't allow BYOK
 *   - `BYOK_REQUIRED`  — tier OK, but no BYOK key on file for the provider
 */
export class ByokResolutionError extends Error {
  code: "UNAUTHORIZED" | "NO_PROFILE" | "TIER_GATE" | "BYOK_REQUIRED";
  constructor(
    code: "UNAUTHORIZED" | "NO_PROFILE" | "TIER_GATE" | "BYOK_REQUIRED",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

export async function getByokAIClient(
  forProvider?: AIProvider,
): Promise<UserAIContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new ByokResolutionError("UNAUTHORIZED", "Unauthorized");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!profile) {
    throw new ByokResolutionError("NO_PROFILE", "Please complete your profile first");
  }
  const userProfile = profile as UserProfile;

  // Tier gate — Advanced Insights is Pro+/Team/Enterprise only.
  const tier = (userProfile.subscription_tier as SubscriptionTier) ?? "free";
  if (!hasFeature(tier, "byok_ai_keys")) {
    throw new ByokResolutionError("TIER_GATE", "Pro plan or above required");
  }

  // Look up the BYOK key. Note we DO NOT consult `force_ai_gateway` here —
  // Advanced Insights always uses BYOK when configured, regardless of the
  // user's "use system AI" preference.
  const candidateProvider = forProvider || (userProfile.ai_provider as AIProvider);

  const { data: providerKey } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
    .eq("user_id", user.id)
    .eq("provider", candidateProvider)
    .single();

  let apiKey: string | null = null;
  if (providerKey) {
    apiKey = decrypt({
      ciphertext: providerKey.api_key_encrypted,
      iv: providerKey.api_key_iv,
      authTag: providerKey.api_key_auth_tag,
    });
  } else if (
    userProfile.ai_api_key_encrypted &&
    userProfile.ai_api_key_iv &&
    userProfile.ai_api_key_auth_tag &&
    userProfile.ai_provider === candidateProvider
  ) {
    // Legacy single-slot key on user_profiles
    apiKey = decrypt({
      ciphertext: userProfile.ai_api_key_encrypted,
      iv: userProfile.ai_api_key_iv,
      authTag: userProfile.ai_api_key_auth_tag,
    });
  }

  if (!apiKey) {
    throw new ByokResolutionError(
      "BYOK_REQUIRED",
      `No API key configured for ${candidateProvider}.`,
    );
  }

  const byokModel = userProfile.ai_model || getDefaultModel(candidateProvider);
  const client = createAIClient(candidateProvider, apiKey, byokModel);
  return {
    client,
    profile: userProfile,
    source: "byok",
    provider: candidateProvider,
    model: byokModel,
  };
}

/**
 * Get the decrypted API key for a specific provider.
 * Useful for image generation and other non-chat uses.
 *
 * @param provider  The AI provider to fetch a key for
 * @param keyType   'text' (default) or 'image' — image generation uses
 *                  separate keys stored with key_type='image'
 */
export async function getProviderApiKey(
  provider: AIProvider,
  keyType: "text" | "image" = "text"
): Promise<{ apiKey: string; profile: UserProfile; source: AISource }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const creatorProfile = profile as UserProfile;

  // BP-125: tier-gating — only Pro/Team/Enterprise users may use BYOK.
  // Image keys gated under byok_image_keys, text under byok_ai_keys (both
  // currently map to "professional"). Free + Personal skip BYOK resolution
  // entirely and fall through to the system-key path below.
  const tier = (creatorProfile.subscription_tier as SubscriptionTier) ?? "free";
  const byokGate = keyType === "image" ? "byok_image_keys" : "byok_ai_keys";
  const byokAllowed = hasFeature(tier, byokGate);

  // Try provider keys table first (filtered by key_type)
  const { data: providerKey } = byokAllowed
    ? await supabase
        .from("ai_provider_keys")
        .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("key_type", keyType)
        .single()
    : { data: null };

  if (providerKey) {
    return {
      apiKey: decrypt({
        ciphertext: providerKey.api_key_encrypted,
        iv: providerKey.api_key_iv,
        authTag: providerKey.api_key_auth_tag,
      }),
      profile: creatorProfile,
      source: "byok",
    };
  }

  // Fall back to legacy single-slot keys on user_profiles (still tier-gated)
  if (byokAllowed && keyType === "image") {
    if (
      creatorProfile.image_ai_provider === provider &&
      creatorProfile.image_ai_api_key_encrypted &&
      creatorProfile.image_ai_api_key_iv &&
      creatorProfile.image_ai_api_key_auth_tag
    ) {
      return {
        apiKey: decrypt({
          ciphertext: creatorProfile.image_ai_api_key_encrypted,
          iv: creatorProfile.image_ai_api_key_iv,
          authTag: creatorProfile.image_ai_api_key_auth_tag,
        }),
        profile: creatorProfile,
        source: "byok",
      };
    }
  } else if (
    byokAllowed &&
    creatorProfile.ai_provider === provider &&
    creatorProfile.ai_api_key_encrypted &&
    creatorProfile.ai_api_key_iv &&
    creatorProfile.ai_api_key_auth_tag
  ) {
    return {
      apiKey: decrypt({
        ciphertext: creatorProfile.ai_api_key_encrypted,
        iv: creatorProfile.ai_api_key_iv,
        authTag: creatorProfile.ai_api_key_auth_tag,
      }),
      profile: creatorProfile,
      source: "byok",
    };
  }

  // Fallback: managed AI access with system keys (text only — image gen
  // does not go through the gateway in Phase 1)
  const systemKey = hasManagedAccess(creatorProfile) ? getSystemKey(provider) : null;
  if (systemKey) {
    return { apiKey: systemKey, profile: creatorProfile, source: "system_key" };
  }

  throw new Error(
    `No API key configured for ${provider}. Please add it in Settings.`
  );
}
