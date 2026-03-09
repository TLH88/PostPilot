import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { createAIClient, type AIProvider } from "@/lib/ai/providers";

const VALID_PROVIDERS = ["anthropic", "openai", "google", "perplexity"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey: providedKey, aiModel } = body;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
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

    // Use provided key or fall back to saved encrypted key
    let apiKey = providedKey;

    if (!apiKey) {
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("ai_api_key_encrypted, ai_api_key_iv, ai_api_key_auth_tag")
        .eq("user_id", user.id)
        .single();

      if (
        !profile?.ai_api_key_encrypted ||
        !profile?.ai_api_key_iv ||
        !profile?.ai_api_key_auth_tag
      ) {
        return NextResponse.json(
          { error: "No API key saved. Please enter a key." },
          { status: 400 }
        );
      }

      apiKey = decrypt({
        ciphertext: profile.ai_api_key_encrypted,
        iv: profile.ai_api_key_iv,
        authTag: profile.ai_api_key_auth_tag,
      });
    }

    // Make a minimal test call
    const client = createAIClient(provider as AIProvider, apiKey, aiModel || undefined);
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
  } catch (error) {
    console.error("Test AI key error:", error);

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
