import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { logApiError } from "@/lib/api-utils";

const VALID_PROVIDERS = ["anthropic", "openai", "google", "perplexity"];

// GET — list all configured providers (without decrypted keys)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("ai_provider_keys")
      .select("id, provider, is_active, created_at, updated_at")
      .eq("user_id", user.id)
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
    const { provider, apiKey, setActive } = await request.json();

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const encrypted = encrypt(apiKey);

    // Upsert — insert or update if provider already exists for this user
    const { error: upsertError } = await supabase
      .from("ai_provider_keys")
      .upsert(
        {
          user_id: user.id,
          provider,
          api_key_encrypted: encrypted.ciphertext,
          api_key_iv: encrypted.iv,
          api_key_auth_tag: encrypted.authTag,
          is_active: setActive ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) throw upsertError;

    // If setting this provider as active, deactivate others
    if (setActive) {
      await supabase
        .from("ai_provider_keys")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .neq("provider", provider);

      // Also update creator_profiles to keep ai_provider in sync
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

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys POST", error);
    return NextResponse.json({ error: "Failed to save provider key" }, { status: 500 });
  }
}

// DELETE — remove a provider key
export async function DELETE(request: NextRequest) {
  try {
    const { provider } = await request.json();

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if this is the active provider
    const { data: key } = await supabase
      .from("ai_provider_keys")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("provider", provider)
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
      .eq("provider", provider);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys DELETE", error);
    return NextResponse.json({ error: "Failed to delete provider key" }, { status: 500 });
  }
}

// PATCH — set active provider (switch)
export async function PATCH(request: NextRequest) {
  try {
    const { provider } = await request.json();

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify this provider has a key stored
    const { data: key } = await supabase
      .from("ai_provider_keys")
      .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (!key) {
      return NextResponse.json(
        { error: "No API key configured for this provider" },
        { status: 400 }
      );
    }

    // Deactivate all, then activate the selected one
    await supabase
      .from("ai_provider_keys")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    await supabase
      .from("ai_provider_keys")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", provider);

    // Sync to creator_profiles for backward compatibility
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

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/provider-keys PATCH", error);
    return NextResponse.json({ error: "Failed to switch provider" }, { status: 500 });
  }
}
