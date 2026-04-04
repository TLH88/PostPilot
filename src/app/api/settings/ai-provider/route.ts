import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";
import { logApiError } from "@/lib/api-utils";

const VALID_PROVIDERS = ["anthropic", "openai", "google", "perplexity"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, aiModel, imageProvider, imageModel, imageApiKey } = body;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Text AI provider settings
    if (provider) {
      if (!VALID_PROVIDERS.includes(provider)) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
      }
      updateData.ai_provider = provider;
      updateData.ai_model = aiModel !== undefined ? aiModel : null;

      if (apiKey) {
        const encrypted = encrypt(apiKey);
        updateData.ai_api_key_encrypted = encrypted.ciphertext;
        updateData.ai_api_key_iv = encrypted.iv;
        updateData.ai_api_key_auth_tag = encrypted.authTag;
      }
    }

    // Image AI provider settings (separate from text AI)
    if (imageProvider) {
      const validImageProviders = ["anthropic", "openai", "google"];
      if (!validImageProviders.includes(imageProvider)) {
        return NextResponse.json({ error: "Invalid image provider" }, { status: 400 });
      }
      updateData.image_ai_provider = imageProvider;
      updateData.image_ai_model = imageModel || null;

      if (imageApiKey) {
        const encrypted = encrypt(imageApiKey);
        updateData.image_ai_api_key_encrypted = encrypted.ciphertext;
        updateData.image_ai_api_key_iv = encrypted.iv;
        updateData.image_ai_api_key_auth_tag = encrypted.authTag;
      }
    }

    const { error: updateError } = await supabase
      .from("creator_profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/settings/ai-provider", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
