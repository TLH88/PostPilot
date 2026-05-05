/**
 * BP-045 follow-up — Unified AI client resolver with system-first /
 * BYOK-fallback semantics.
 *
 * Owner direction 2026-05-04: BYOK is no longer a replacement for system
 * keys when configured — it's a *fallback* used after the user's monthly
 * system allocation is exhausted (per-feature quota, BP-117) or after a
 * budget kill-switch trips (BP-085 P3 paused / over_limit). Configuring
 * BYOK does not reduce subscription fees or the included system quota;
 * it only ensures the user can keep working past those limits.
 *
 * For Pro+ users with BYOK configured, this resolver:
 *   1. Tries the system path first (gateway / system_key) gated on
 *      checkQuota + checkBudget.
 *   2. Falls back to BYOK if either gate would otherwise return 402.
 *   3. Annotates the result with `isFallback` + `fallbackReason` so the
 *      AI route knows whether to skip its `incrementQuota` call (system
 *      counters only advance for system-path traffic).
 *
 * For Free / Personal users, BYOK is not available regardless of stored
 * keys — the resolver only ever returns the system path or a block.
 *
 * For users with `force_ai_gateway = true`, BYOK fallback is skipped
 * entirely (the toggle's existing semantic of "don't use BYOK"
 * preserves; a future BP can flip the toggle's meaning to "BYOK-only,
 * never system" if owner wants — see project memory).
 */

import { decrypt } from "@/lib/encryption";
import { createClient } from "@/lib/supabase/server";
import {
  createAIClient,
  createGatewayClient,
  getDefaultModel,
  type AIClient,
  type AIProvider,
} from "@/lib/ai/providers";
import { getSystemAIDefaults } from "@/lib/ai/system-defaults";
import { checkQuota, buildQuotaExceededResponse } from "@/lib/quota";
import { checkBudget, buildBudgetExceededBody } from "@/lib/ai/budget-check";
import { hasFeature } from "@/lib/feature-gate";
import { logApiError } from "@/lib/api-utils";
import type { SubscriptionTier, QuotaType } from "@/lib/constants";
import type { UserProfile } from "@/types";

// System keys for direct-provider fallback when the gateway isn't configured.
const SYSTEM_AI_KEYS: Partial<Record<AIProvider, string | undefined>> = {
  openai: process.env.SYSTEM_AI_KEY_OPENAI,
  anthropic: process.env.SYSTEM_AI_KEY_ANTHROPIC,
  google: process.env.SYSTEM_AI_KEY_GOOGLE,
  perplexity: process.env.SYSTEM_AI_KEY_PERPLEXITY,
};

export type AISource = "gateway" | "system_key" | "byok";
export type FallbackReason = "quota_exhausted" | "budget_paused" | "budget_over_limit";

export interface AiResolution {
  client: AIClient;
  profile: UserProfile;
  source: AISource;
  provider: AIProvider;
  model: string;
  /**
   * True when the resolver fell back to BYOK because the system path was
   * blocked (quota or budget). Routes should skip `incrementQuota` when
   * this is true — system counters must only advance on system-path calls.
   */
  isFallback: boolean;
  fallbackReason?: FallbackReason;
}

export interface AiBlock {
  status: number;
  body: Record<string, unknown>;
}

export type AiResolutionResult =
  | { ok: true; resolution: AiResolution }
  | { ok: false; block: AiBlock };

/**
 * Looks up the BYOK key (provider-keys table first, legacy single-slot
 * fallback). Returns null when the user is ineligible (tier or
 * force_ai_gateway) or has no key configured for the requested provider.
 */
async function resolveBYOKKey(
  profile: UserProfile,
  forProvider: AIProvider,
): Promise<string | null> {
  const supabase = await createClient();
  const tier = (profile.subscription_tier as SubscriptionTier) ?? "free";

  if (!hasFeature(tier, "byok_ai_keys")) return null;
  // `force_ai_gateway` historically meant "always system, never BYOK" —
  // we preserve that semantic here as the BYOK opt-out switch.
  const gatewayAvailable =
    !!process.env.VERCEL_OIDC_TOKEN || !!process.env.AI_GATEWAY_API_KEY;
  if (profile.force_ai_gateway && gatewayAvailable) return null;

  // Provider-specific key from ai_provider_keys (text key_type by default).
  const { data: providerKey } = await supabase
    .from("ai_provider_keys")
    .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
    .eq("user_id", profile.user_id)
    .eq("provider", forProvider)
    .single();

  if (providerKey) {
    return decrypt({
      ciphertext: providerKey.api_key_encrypted,
      iv: providerKey.api_key_iv,
      authTag: providerKey.api_key_auth_tag,
    });
  }

  // Legacy single-slot key on user_profiles — only valid if the user's
  // saved provider matches the one we're being asked for.
  if (
    profile.ai_provider === forProvider &&
    profile.ai_api_key_encrypted &&
    profile.ai_api_key_iv &&
    profile.ai_api_key_auth_tag
  ) {
    return decrypt({
      ciphertext: profile.ai_api_key_encrypted,
      iv: profile.ai_api_key_iv,
      authTag: profile.ai_api_key_auth_tag,
    });
  }

  return null;
}

/**
 * "Active" account state required for system AI. Mirrors the historical
 * `hasManagedAccess` check from `get-user-ai-client.ts`.
 */
function hasActiveSystemAccess(profile: UserProfile): boolean {
  if (profile.account_status === "active") return true;
  if (profile.account_status === "trial" && profile.trial_ends_at) {
    if (new Date(profile.trial_ends_at) > new Date()) return true;
  }
  if (!profile.managed_ai_access) return false;
  if (!profile.managed_ai_expires_at) return true;
  return new Date(profile.managed_ai_expires_at) > new Date();
}

/**
 * Build a system-path resolution (gateway preferred, direct system key
 * as the last-resort fallback when no gateway is configured).
 */
function buildSystemResolution(
  profile: UserProfile,
  forProvider: AIProvider | undefined,
  systemDefaults: { provider: AIProvider; model: string },
): AiResolution | null {
  if (!hasActiveSystemAccess(profile)) return null;
  const systemProvider = forProvider ?? systemDefaults.provider;
  const systemModel = forProvider
    ? getDefaultModel(forProvider)
    : systemDefaults.model;
  const gatewayAvailable =
    !!process.env.VERCEL_OIDC_TOKEN || !!process.env.AI_GATEWAY_API_KEY;

  if (gatewayAvailable) {
    return {
      client: createGatewayClient(systemProvider, systemModel),
      profile,
      source: "gateway",
      provider: systemProvider,
      model: systemModel,
      isFallback: false,
    };
  }
  const directKey = SYSTEM_AI_KEYS[systemProvider];
  if (!directKey) return null;
  return {
    client: createAIClient(systemProvider, directKey, systemModel),
    profile,
    source: "system_key",
    provider: systemProvider,
    model: systemModel,
    isFallback: false,
  };
}

/**
 * Build a BYOK resolution. Used both for the user's preferred provider
 * (when caller didn't specify) and for caller-pinned providers (e.g.,
 * provider-specific routes).
 */
async function buildBYOKResolution(
  profile: UserProfile,
  forProvider: AIProvider | undefined,
  reason: FallbackReason,
): Promise<AiResolution | null> {
  const candidate = forProvider ?? (profile.ai_provider as AIProvider);
  if (!candidate) return null;
  const apiKey = await resolveBYOKKey(profile, candidate);
  if (!apiKey) return null;
  const model = profile.ai_model || getDefaultModel(candidate);
  return {
    client: createAIClient(candidate, apiKey, model),
    profile,
    source: "byok",
    provider: candidate,
    model,
    isFallback: true,
    fallbackReason: reason,
  };
}

export interface ResolveAiOptions {
  feature: QuotaType;
  /** Optional provider pin (image-gen pins openai etc.). */
  forProvider?: AIProvider;
}

/**
 * Top-level AI selector. Each AI route calls this once.
 */
export async function resolveAi(
  options: ResolveAiOptions,
): Promise<AiResolutionResult> {
  const { feature, forProvider } = options;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, block: { status: 401, body: { error: "Unauthorized" } } };
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (profileError || !profileRow) {
    return {
      ok: false,
      block: { status: 400, body: { error: "Please complete your profile first" } },
    };
  }
  const profile = profileRow as UserProfile;

  // Run quota + budget checks against the *system* path. BYOK never
  // counts toward system quota, so we always check unbypassed here —
  // the bypass-on-byok pattern from BP-117 belongs to the old model.
  const quota = await checkQuota(user.id, feature);
  const budget = await checkBudget(user.id);

  const systemDefaults = await getSystemAIDefaults();

  // Happy path — system has capacity.
  if (quota.allowed && budget.ok) {
    const resolution = buildSystemResolution(profile, forProvider, systemDefaults);
    if (resolution) return { ok: true, resolution };
    // Active system access not granted (e.g. churned, no trial). Try BYOK
    // as a last resort — Pro+ users with BYOK keys can still work even
    // when their managed-AI window has lapsed.
    const byok = await buildBYOKResolution(profile, forProvider, "quota_exhausted");
    if (byok) return { ok: true, resolution: byok };
    return {
      ok: false,
      block: {
        status: 402,
        body: { error: "AI access not available — check account status or BYOK keys" },
      },
    };
  }

  // System path is blocked. Determine the fallback reason for logging.
  const reason: FallbackReason = !quota.allowed
    ? "quota_exhausted"
    : budget.ok
      ? "quota_exhausted" // unreachable; satisfies type system
      : budget.reason === "paused"
        ? "budget_paused"
        : "budget_over_limit";

  // Attempt BYOK fallback. When force_ai_gateway is true, BYOK is
  // intentionally unavailable and we 402.
  const byokResolution = await buildBYOKResolution(profile, forProvider, reason);
  if (byokResolution) {
    return { ok: true, resolution: byokResolution };
  }

  // No BYOK fallback available — return the appropriate 402 body.
  if (!quota.allowed) {
    const quotaResp = buildQuotaExceededResponse(quota, feature);
    let body: Record<string, unknown> = {};
    try {
      body = (await quotaResp.json()) as Record<string, unknown>;
    } catch (err) {
      logApiError("resolveAi:parse-quota-body", err);
      body = { error: "Quota exceeded" };
    }
    return { ok: false, block: { status: quotaResp.status, body } };
  }
  if (!budget.ok) {
    return {
      ok: false,
      block: { status: 402, body: buildBudgetExceededBody(budget) as unknown as Record<string, unknown> },
    };
  }

  return {
    ok: false,
    block: { status: 402, body: { error: "AI access blocked" } },
  };
}
