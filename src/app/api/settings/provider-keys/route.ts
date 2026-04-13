import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";
import { logApiError } from "@/lib/api-utils";
import { hasFeature } from "@/lib/feature-gate";
import type { SubscriptionTier } from "@/lib/constants";

const VALID_TEXT_PROVIDERS = ["anthropic", "openai", "google", "perplexity"];
const VALID_IMAGE_PROVIDERS = ["openai", "google"];
type KeyType = "text" | "image";

function parseKeyType(value: unknown): KeyType {
  return value === "image" ? "image" : "text";
}

function validProvidersFor(keyType: KeyType): string[] {
  return keyType === "image" ? VALID_IMAGE_PROVIDERS : VALID_TEXT_PROVIDERS;
}

function featureKeyFor(keyType: KeyType): string {
  return keyType === "image" ? "byok_image_keys" : "byok_ai_keys";
}

async function getUserAndTier() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tier: "free" as SubscriptionTier };

  const { data: profile } = await supabase
    .from("creator_profiles")
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
      .select("id, provider, key_type, is_active, tested_at, created_at, updated_at")
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

// POST — add or update a provider key
export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, setActive, keyType: rawKeyType } = await request.json();
    const keyType = parseKeyType(rawKeyType);
    const validProviders = validProvidersFor(keyType);

    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const { supabase, user, tier } = await getUserAndTier();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Tier gating: BYOK is Professional+
    if (!hasFeature(tier, featureKeyFor(keyType))) {
      return NextResponse.json(
        { error: "BYOK provider keys are available on the Professional plan and above." },
        { status: 403 }
      );
    }

    const encrypted = encrypt(apiKey);

    // Upsert — insert or update if (user, provider, key_type) already exists
    const { error: upsertError } = await supabase
      .from("ai_provider_keys")
      .upsert(
        {
          user_id: user.id,
          provider,
          key_type: keyType,
          api_key_encrypted: encrypted.ciphertext,
          api_key_iv: encrypted.iv,
          api_key_auth_tag: encrypted.authTag,
          is_active: setActive ?? false,
          tested_at: null, // Reset test status on save — user must re-test
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,key_type" }
      );

    if (upsertError) throw upsertError;

    // If setting this provider as active, deactivate others of the same key_type
    if (setActive) {
      await supabase
        .from("ai_provider_keys")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("key_type", keyType)
        .neq("provider", provider);

      // Keep creator_profiles in sync for TEXT keys only (legacy path)
      if (keyType === "text") {
        await supabase
          .from("creator_profiles")
          .update({
            ai_provider: provider,
            ai_api_key_encrypted: encrypted.ciphertext,
            ai_api_key_iv: encrypted.iv,
            ai_api_key_auth_tag: encrypted.authTag,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys POST", error);
    return NextResponse.json({ error: "Failed to save provider key" }, { status: 500 });
  }
}

// DELETE — remove a provider key
export async function DELETE(request: NextRequest) {
  try {
    const { provider, keyType: rawKeyType } = await request.json();
    const keyType = parseKeyType(rawKeyType);
    const validProviders = validProvidersFor(keyType);

    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const { supabase, user, tier } = await getUserAndTier();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasFeature(tier, featureKeyFor(keyType))) {
      return NextResponse.json(
        { error: "BYOK provider keys are available on the Professional plan and above." },
        { status: 403 }
      );
    }

    // Check if this is the active provider
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

// PATCH — set active provider (switch)
export async function PATCH(request: NextRequest) {
  try {
    const { provider, keyType: rawKeyType } = await request.json();
    const keyType = parseKeyType(rawKeyType);
    const validProviders = validProvidersFor(keyType);

    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const { supabase, user, tier } = await getUserAndTier();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasFeature(tier, featureKeyFor(keyType))) {
      return NextResponse.json(
        { error: "BYOK provider keys are available on the Professional plan and above." },
        { status: 403 }
      );
    }

    // Verify this provider has a key stored
    const { data: key } = await supabase
      .from("ai_provider_keys")
      .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
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

    // Deactivate all of this key_type, then activate the selected one
    await supabase
      .from("ai_provider_keys")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("key_type", keyType);

    await supabase
      .from("ai_provider_keys")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType);

    // Sync to creator_profiles for TEXT keys only (legacy path)
    if (keyType === "text") {
      await supabase
        .from("creator_profiles")
        .update({
          ai_provider: provider,
          ai_api_key_encrypted: key.api_key_encrypted,
          ai_api_key_iv: key.api_key_iv,
          ai_api_key_auth_tag: key.api_key_auth_tag,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys PATCH", error);
    return NextResponse.json({ error: "Failed to switch provider" }, { status: 500 });
  }
}
