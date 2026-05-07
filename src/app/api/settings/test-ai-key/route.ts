import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { getAdapter } from "@/lib/ai/adapters/registry";
import { refreshProviderModels } from "@/lib/ai/adapters/refresh-models";
import { logApiError } from "@/lib/api-utils";

/**
 * Validates a provider API key (POST { provider, apiKey?, keyType? })
 * and — on success — refreshes the provider's model list in `ai_models`
 * for the requested kind.
 *
 * Validation goes through the provider adapter (`getAdapter(slug)`),
 * which hits a cheap endpoint (typically the provider's models list)
 * rather than burning inference tokens.
 *
 * Side-effect: `refreshProviderModels` repopulates the model catalog
 * for that provider+kind. On transient failures the adapter retries up
 * to 3 times (see ./retry.ts); on terminal failures the existing rows
 * are left intact and the response includes a non-blocking warning so
 * the UI can toast it without blocking the test result.
 *
 * Body:
 *   provider:  slug from ai_providers (validated against the registry)
 *   apiKey?:   when omitted, falls back to the user's saved encrypted key
 *   keyType?:  'text' | 'image' (default 'text')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey: providedKey, keyType: rawKeyType } = body;
    const keyType: "text" | "image" = rawKeyType === "image" ? "image" : "text";

    const adapter = getAdapter(provider);
    if (!adapter) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the request-supplied key, otherwise fall back to the saved encrypted
    // copy in ai_provider_keys (lets the UI offer a "test saved key" flow).
    let apiKey = providedKey as string | undefined;
    if (!apiKey) {
      const { data: storedKey } = await supabase
        .from("ai_provider_keys")
        .select("api_key_encrypted, api_key_iv, api_key_auth_tag")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("key_type", keyType)
        .single();

      if (
        !storedKey?.api_key_encrypted ||
        !storedKey?.api_key_iv ||
        !storedKey?.api_key_auth_tag
      ) {
        return NextResponse.json(
          { error: "No API key saved. Please enter a key." },
          { status: 400 }
        );
      }

      apiKey = decrypt({
        ciphertext: storedKey.api_key_encrypted,
        iv: storedKey.api_key_iv,
        authTag: storedKey.api_key_auth_tag,
      });
    }

    const validation = await adapter.validateKey(apiKey);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error ?? "API key test failed" },
        { status: 401 }
      );
    }

    // Persist the test-success timestamp. No-op if no row exists yet
    // (user is testing before saving), which is fine.
    await supabase
      .from("ai_provider_keys")
      .update({ tested_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType);

    // Refresh model catalog (with adapter-level 3-retry already inside).
    // Refresh is best-effort: a failure here doesn't invalidate the test,
    // it just means the model list stays at its previous state.
    const refresh = await refreshProviderModels(supabase, provider, apiKey, keyType);

    return NextResponse.json({
      success: true,
      message: `${adapter.slug} API key is valid.`,
      modelsRefreshed: refresh.ok ? refresh.count : 0,
      modelsWarning: refresh.ok ? undefined : refresh.error,
    });
  } catch (error: unknown) {
    logApiError("api/settings/test-ai-key", error);
    const message =
      error instanceof Error ? error.message : "API key test failed";
    return NextResponse.json(
      { error: `API key test failed: ${message}` },
      { status: 500 }
    );
  }
}
