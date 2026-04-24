import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import {
  createAIClient,
  createGatewayClient,
  getDefaultModel,
  type AIClient,
  type AIProvider,
} from "./providers";
import { getSystemAIDefaults } from "./system-defaults";
import type { UserProfile } from "@/types";

// System-level API keys for managed/trial access (env vars, never exposed to browser)
const SYSTEM_AI_KEYS: Partial<Record<AIProvider, string | undefined>> = {
  openai: process.env.SYSTEM_AI_KEY_OPENAI,
  anthropic: process.env.SYSTEM_AI_KEY_ANTHROPIC,
  google: process.env.SYSTEM_AI_KEY_GOOGLE,
  perplexity: process.env.SYSTEM_AI_KEY_PERPLEXITY,
};

/**
 * Check if a user has valid managed AI access (trial or admin-granted).
 * Access is granted if:
 * 1. managed_ai_access is true AND not expired, OR
 * 2. User is on an active trial (account_status='trial' and trial_ends_at is in the future)
 */
function hasManagedAccess(profile: UserProfile): boolean {
  // Active trial grants managed access
  if (profile.account_status === "trial" && profile.trial_ends_at) {
    if (new Date(profile.trial_ends_at) > new Date()) return true;
  }
  // Legacy / admin-granted managed access
  if (!profile.managed_ai_access) return false;
  if (!profile.managed_ai_expires_at) return true; // no expiry = permanent (admin override)
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

  let providerKey: { api_key_encrypted: string; api_key_iv: string; api_key_auth_tag: string } | null = null;
  if (!forceGateway) {
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

  const systemDefaults = await getSystemAIDefaults();
  // Callers that specify forProvider (e.g. image gen) honor that — system
  // defaults only apply when the route is provider-agnostic.
  const systemProvider = forProvider || systemDefaults.provider;
  const systemModel = forProvider ? getDefaultModel(forProvider) : systemDefaults.model;

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

  // Try provider keys table first (filtered by key_type)
  const { data: providerKey } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .eq("key_type", keyType)
    .single();

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

  // Fall back to legacy single-slot keys on user_profiles
  if (keyType === "image") {
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
