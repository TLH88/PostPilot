import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { createAIClient, type AIProvider } from "@/lib/ai/providers";
import { logApiError } from "@/lib/api-utils";

const VALID_TEXT_PROVIDERS = ["anthropic", "openai", "google", "perplexity"];
const VALID_IMAGE_PROVIDERS = ["openai", "google"];

function parseKeyType(value: unknown): "text" | "image" {
  return value === "image" ? "image" : "text";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey: providedKey, aiModel, keyType: rawKeyType } = body;
    const keyType = parseKeyType(rawKeyType);

    const validProviders =
      keyType === "image" ? VALID_IMAGE_PROVIDERS : VALID_TEXT_PROVIDERS;

    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use provided key or fall back to saved encrypted key from ai_provider_keys
    let apiKey = providedKey;

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

    // Image keys can't be validated with a chat message, so we just do a
    // minimal auth check by hitting the chat completions endpoint. Image
    // providers (OpenAI, Google) both support chat completions with the same
    // key, so this verifies the key is valid for the account.
    const testProvider = (keyType === "image" ? provider : provider) as AIProvider;

    const client = createAIClient(testProvider, apiKey, aiModel || undefined);
    const response = await client.createMessage({
      systemPrompt: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Say 'ok'" }],
      maxTokens: 10,
    });

    if (!response.text) {
      return NextResponse.json(
        { error: "API key test failed: no response received" },
        { status: 400 }
      );
    }

    // Persist test success timestamp. This UPDATE is a no-op if the key
    // wasn't saved yet (user testing before saving), which is fine.
    await supabase
      .from("ai_provider_keys")
      .update({ tested_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("key_type", keyType);

    const providerLabel =
      provider === "anthropic"
        ? "Anthropic"
        : provider === "openai"
          ? "OpenAI"
          : provider === "google"
            ? "Google Gemini"
            : "Perplexity";

    return NextResponse.json({
      success: true,
      message: `${providerLabel} API key is valid and working.`,
    });
  } catch (error: unknown) {
    logApiError("api/settings/test-ai-key", error);

    const message =
      error instanceof Error ? error.message : "API key test failed";

    if (
      message.includes("401") ||
      message.includes("Unauthorized") ||
      message.includes("invalid") ||
      message.includes("Invalid API Key") ||
      message.includes("Incorrect API key")
    ) {
      return NextResponse.json(
        { error: "Invalid API key. Please check and try again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `API key test failed: ${message}` },
      { status: 500 }
    );
  }
}
