import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";
import { logApiError } from "@/lib/api-utils";
import { hasFeature } from "@/lib/feature-gate";
import { getAdapter } from "@/lib/ai/adapters/registry";
import { refreshProviderModels } from "@/lib/ai/adapters/refresh-models";
import type { SubscriptionTier } from "@/lib/constants";

type KeyType = "text" | "image";

function parseKeyType(value: unknown): KeyType {
  return value === "image" ? "image" : "text";
}

function parseKeyTypes(value: unknown): KeyType[] {
  if (Array.isArray(value)) {
    const out: KeyType[] = [];
    for (const v of value) {
      if (v === "text" && !out.includes("text")) out.push("text");
      if (v === "image" && !out.includes("image")) out.push("image");
    }
    return out;
  }
  // Back-compat: single keyType string still accepted.
  if (value === "text" || value === "image") return [value];
  return [];
}

function featureKeyFor(keyType: KeyType): string {
  return keyType === "image" ? "byok_image_keys" : "byok_ai_keys";
}

async function loadProviderCapabilities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string
): Promise<KeyType[] | null> {
  const { data } = await supabase
    .from("ai_providers")
    .select("capabilities, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  const caps = (data.capabilities as string[] | null) ?? [];
  return caps.filter((c) => c === "text" || c === "image") as KeyType[];
}

async function getUserAndTier() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tier: "free" as SubscriptionTier };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier")
    .eq("user_id", user.id)
    .single();

  const tier = (profile?.subscription_tier as SubscriptionTier) ?? "free";
  return { supabase, user, tier };
}

// GET — list configured providers for a key type (no encrypted fields returned)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const keyType = parseKeyType(url.searchParams.get("keyType"));

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("ai_provider_keys")
      .select("id, provider, key_type, is_active, tested_at, model_id, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("key_type", keyType)
      .order("created_at");

    if (error) throw error;

    return NextResponse.json({ keys: data ?? [] });
  } catch (error) {
    logApiError("api/settings/provider-keys GET", error);
    return NextResponse.json({ error: "Failed to fetch provider keys" }, { status: 500 });
  }
}

/**
 * POST — add or update a provider key for one or more capabilities.
 *
 * Body:
 *   provider:  ai_providers.slug
 *   apiKey:    plaintext, will be encrypted before storage
 *   keyTypes:  ('text' | 'image')[]   — both can be saved with one call
 *              when a provider supports both (OpenAI, Google).
 *   keyType:   legacy single-value form, also accepted.
 *   setActive?: when true, switch this provider to active for each saved kind
 *
 * Validation:
 *   - Provider must exist in the adapter registry AND ai_providers (active).
 *   - Each requested keyType must be in the provider's `capabilities` set.
 *   - The key is validated against the provider via the adapter BEFORE
 *     anything is encrypted/stored — security default per project memory:
 *     don't persist credentials we haven't proven work.
 *
 * Side-effect on success: refreshProviderModels per kind (best-effort).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, setActive } = body;
    const keyTypes = parseKeyTypes(body.keyTypes ?? body.keyType);

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }
    if (keyTypes.length === 0) {
      return NextResponse.json(
        { error: "At least one capability (text or image) is required." },
        { status: 400 }
      );
    }

    const adapter = getAdapter(provider);
    if (!adapter) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const { supabase, user, tier } = await getUserAndTier();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Provider must be active in the registry, and must declare every
    // requested capability.
    const supported = await loadProviderCapabilities(supabase, provider);
    if (!supported) {
      return NextResponse.json({ error: "Provider is not enabled" }, { status: 400 });
    }
    for (const kt of keyTypes) {
      if (!supported.includes(kt)) {
        return NextResponse.json(
          { error: `Provider ${provider} does not support ${kt} generation.` },
          { status: 400 }
        );
      }
      // Tier gating per capability.
      if (!hasFeature(tier, featureKeyFor(kt))) {
        return NextResponse.json(
          { error: "BYOK provider keys are available on the Professional plan and above." },
          { status: 403 }
        );
      }
    }

    // Validate the key BEFORE storing. This avoids saving credentials
    // we haven't proven against the provider's auth (Default to Most
    // Secure / Best Practice — owner direction).
    const validation = await adapter.validateKey(apiKey);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error ?? "API key validation failed" },
        { status: 401 }
      );
    }

    const encrypted = encrypt(apiKey);
    const now = new Date().toISOString();

    // Upsert one row per requested capability.
    for (const kt of keyTypes) {
      const { error: upsertError } = await supabase
        .from("ai_provider_keys")
        .upsert(
          {
            user_id: user.id,
            provider,
            key_type: kt,
            api_key_encrypted: encrypted.ciphertext,
            api_key_iv: encrypted.iv,
            api_key_auth_tag: encrypted.authTag,
            is_active: setActive ?? false,
            tested_at: now, // Adapter just validated successfully.
            updated_at: now,
          },
          { onConflict: "user_id,provider,key_type" }
        );
      if (upsertError) throw upsertError;
    }

    // If the user marked this active, deactivate other providers of the
    // same kind(s) and sync user_profiles for the text path (legacy
    // runtime in get-user-ai-client / resolve-ai still reads from there).
    if (setActive) {
      for (const kt of keyTypes) {
        await supabase
          .from("ai_provider_keys")
          .update({ is_active: false, updated_at: now })
          .eq("user_id", user.id)
          .eq("key_type", kt)
          .neq("provider", provider);

        if (kt === "text") {
          await supabase
            .from("user_profiles")
            .update({
              ai_provider: provider,
              ai_api_key_encrypted: encrypted.ciphertext,
              ai_api_key_iv: encrypted.iv,
              ai_api_key_auth_tag: encrypted.authTag,
              updated_at: now,
            })
            .eq("user_id", user.id);
        }
      }
    }

    // Best-effort model catalog refresh per kind.
    const refreshSummary: Record<KeyType, { ok: boolean; count: number; error?: string }> = {
      text: { ok: true, count: 0 },
      image: { ok: true, count: 0 },
    };
    for (const kt of keyTypes) {
      const r = await refreshProviderModels(supabase, provider, apiKey, kt);
      refreshSummary[kt] = { ok: r.ok, count: r.count, error: r.error };
    }

    return NextResponse.json({
      success: true,
      saved: keyTypes,
      refresh: refreshSummary,
    });
  } catch (error) {
    logApiError("api/settings/provider-keys POST", error);
    return NextResponse.json({ error: "Failed to save provider key" }, { status: 500 });
  }
}

// DELETE — remove a provider key for a specific capability
export async function DELETE(request: NextRequest) {
  try {
    const { provider, keyType: rawKeyType } = await request.json();
    const keyType = parseKeyType(rawKeyType);

    if (!provider || !getAdapter(provider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const { supabase, user, tier } = await getUserAndTier();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasFeature(tier, featureKeyFor(keyType))) {
      return NextResponse.json(
        { error: "BYOK provider keys are available on the Professional plan and above." },
        { status: 403 }
      );
    }

    const { data: key } = await supabase
      .from("ai_provider_keys")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType)
      .single();

    if (key?.is_active) {
      return NextResponse.json(
        { error: "Cannot delete the active provider. Switch to another provider first." },
        { status: 400 }
      );
    }

    await supabase
      .from("ai_provider_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys DELETE", error);
    return NextResponse.json({ error: "Failed to delete provider key" }, { status: 500 });
  }
}

/**
 * PUT — update the model preference for a configured provider key.
 * Body: { provider, keyType, modelId }
 *
 * If the user is updating the *active* text key, also syncs
 * user_profiles.ai_model so the runtime AI client (which still reads
 * from user_profiles) picks up the change without further plumbing.
 */
export async function PUT(request: NextRequest) {
  try {
    const { provider, keyType: rawKeyType, modelId } = await request.json();
    const keyType = parseKeyType(rawKeyType);

    if (!provider || !getAdapter(provider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
    if (typeof modelId !== "string" || !modelId.trim()) {
      return NextResponse.json({ error: "modelId is required" }, { status: 400 });
    }

    const { supabase, user, tier } = await getUserAndTier();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasFeature(tier, featureKeyFor(keyType))) {
      return NextResponse.json(
        { error: "BYOK provider keys are available on the Professional plan and above." },
        { status: 403 }
      );
    }

    // Verify the key exists for this user/provider/kind, and capture
    // is_active so we know whether to mirror into user_profiles.
    const { data: existing } = await supabase
      .from("ai_provider_keys")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType)
      .single();
    if (!existing) {
      return NextResponse.json(
        { error: "No API key configured for this provider" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await supabase
      .from("ai_provider_keys")
      .update({ model_id: modelId, updated_at: now })
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType);

    // Mirror onto user_profiles.ai_model when this is the active text key
    // (runtime AI client reads from user_profiles).
    if (existing.is_active && keyType === "text") {
      await supabase
        .from("user_profiles")
        .update({ ai_model: modelId, updated_at: now })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys PUT", error);
    return NextResponse.json({ error: "Failed to update model" }, { status: 500 });
  }
}

// PATCH — set active provider (switch) for a kind
export async function PATCH(request: NextRequest) {
  try {
    const { provider, keyType: rawKeyType } = await request.json();
    const keyType = parseKeyType(rawKeyType);

    if (!provider || !getAdapter(provider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const { supabase, user, tier } = await getUserAndTier();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasFeature(tier, featureKeyFor(keyType))) {
      return NextResponse.json(
        { error: "BYOK provider keys are available on the Professional plan and above." },
        { status: 403 }
      );
    }

    const { data: key } = await supabase
      .from("ai_provider_keys")
      .select("api_key_encrypted, api_key_iv, api_key_auth_tag, model_id")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType)
      .single();

    if (!key) {
      return NextResponse.json(
        { error: "No API key configured for this provider" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await supabase
      .from("ai_provider_keys")
      .update({ is_active: false, updated_at: now })
      .eq("user_id", user.id)
      .eq("key_type", keyType);

    await supabase
      .from("ai_provider_keys")
      .update({ is_active: true, updated_at: now })
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType);

    if (keyType === "text") {
      // Bring the per-key model preference along so the runtime client
      // (which reads user_profiles.ai_model) uses the right model for
      // the newly-active provider. `null` is fine — it tells the runtime
      // to fall back to the provider default via getDefaultModel().
      await supabase
        .from("user_profiles")
        .update({
          ai_provider: provider,
          ai_model: key.model_id ?? null,
          ai_api_key_encrypted: key.api_key_encrypted,
          ai_api_key_iv: key.api_key_iv,
          ai_api_key_auth_tag: key.api_key_auth_tag,
          updated_at: now,
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys PATCH", error);
    return NextResponse.json({ error: "Failed to switch provider" }, { status: 500 });
  }
}
