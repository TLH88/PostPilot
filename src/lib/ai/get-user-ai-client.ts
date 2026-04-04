import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { createAIClient, type AIClient, type AIProvider } from "./providers";
import type { CreatorProfile } from "@/types";

// System-level API keys for managed/trial access (env vars, never exposed to browser)
const SYSTEM_AI_KEYS: Partial<Record<AIProvider, string | undefined>> = {
  openai: process.env.SYSTEM_AI_KEY_OPENAI,
  anthropic: process.env.SYSTEM_AI_KEY_ANTHROPIC,
  google: process.env.SYSTEM_AI_KEY_GOOGLE,
  perplexity: process.env.SYSTEM_AI_KEY_PERPLEXITY,
};

/**
 * Check if a user has valid managed AI access (trial or admin-granted).
 */
function hasManagedAccess(profile: CreatorProfile): boolean {
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

interface UserAIContext {
  client: AIClient;
  profile: CreatorProfile;
}

/**
 * Get the AI client for a specific provider (or the active one).
 * Reads keys from ai_provider_keys table first, falls back to creator_profiles.
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
    .from("creator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Please complete your profile first");
  }

  const creatorProfile = profile as CreatorProfile;
  const targetProvider = forProvider || (creatorProfile.ai_provider as AIProvider);

  // Try to get key from ai_provider_keys table first
  const { data: providerKey } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
    .eq("user_id", user.id)
    .eq("provider", targetProvider)
    .single();

  let apiKey: string;

  if (providerKey) {
    // Use key from the new provider keys table
    apiKey = decrypt({
      ciphertext: providerKey.api_key_encrypted,
      iv: providerKey.api_key_iv,
      authTag: providerKey.api_key_auth_tag,
    });
  } else if (
    creatorProfile.ai_api_key_encrypted &&
    creatorProfile.ai_api_key_iv &&
    creatorProfile.ai_api_key_auth_tag &&
    creatorProfile.ai_provider === targetProvider
  ) {
    // Fall back to legacy single-key on creator_profiles
    apiKey = decrypt({
      ciphertext: creatorProfile.ai_api_key_encrypted,
      iv: creatorProfile.ai_api_key_iv,
      authTag: creatorProfile.ai_api_key_auth_tag,
    });
  } else {
    // Fallback: check managed AI access (trial/beta) with system keys
    const systemKey = hasManagedAccess(creatorProfile) ? getSystemKey(targetProvider) : null;
    if (systemKey) {
      apiKey = systemKey;
    } else {
      throw new Error(
        `No API key configured for ${targetProvider}. Please add your API key in Settings.`
      );
    }
  }

  const client = createAIClient(
    targetProvider,
    apiKey,
    creatorProfile.ai_model
  );

  return { client, profile: creatorProfile };
}

/**
 * Get the decrypted API key for a specific provider.
 * Useful for image generation and other non-chat uses.
 */
export async function getProviderApiKey(
  provider: AIProvider
): Promise<{ apiKey: string; profile: CreatorProfile }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const creatorProfile = profile as CreatorProfile;

  // Try provider keys table first
  const { data: providerKey } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .single();

  if (providerKey) {
    return {
      apiKey: decrypt({
        ciphertext: providerKey.api_key_encrypted,
        iv: providerKey.api_key_iv,
        authTag: providerKey.api_key_auth_tag,
      }),
      profile: creatorProfile,
    };
  }

  // Fall back to legacy key if provider matches
  if (
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
    };
  }

  // Fallback: managed AI access with system keys
  const systemKey = hasManagedAccess(creatorProfile) ? getSystemKey(provider) : null;
  if (systemKey) {
    return { apiKey: systemKey, profile: creatorProfile };
  }

  throw new Error(
    `No API key configured for ${provider}. Please add it in Settings.`
  );
}
