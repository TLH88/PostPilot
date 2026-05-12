import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";
import { incrementQuota } from "@/lib/quota";
import { logAiUsage, classifyAiError } from "@/lib/ai/usage-logger";
import { resolveImageProvider } from "@/lib/ai/resolve-ai";
import { getUserTier } from "@/lib/quota";
import { hasFeature } from "@/lib/feature-gate";
import { BASIC_IMAGE_MODELS } from "@/lib/ai/image-model-tiers";
import OpenAI from "openai";
import type { AIProvider } from "@/lib/ai/providers";

const ART_STYLES = [
  "Clean, modern corporate illustration",
  "Minimalist flat design",
  "Professional infographic style",
  "Photorealistic",
  "Abstract geometric",
  "Hand-drawn sketch",
  "Isometric 3D illustration",
  "Watercolor painting",
] as const;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let imgProvider: string | undefined;
  let imgModel: string | undefined;
  let userId: string | undefined;
  // Track any storage path that was uploaded so we can clean it up on abort
  let uploadedStoragePath: string | undefined;
  const signal = request.signal;

  try {
    const { postId, prompt: customPrompt, artStyle, imageFormat, includeText, imageText, imageProvider: requestProvider, imageModel: requestModel } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch post content
    const { data: post } = await supabase
      .from("posts")
      .select("title, content")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get profile to determine provider. Prefer image_ai_provider (dedicated
    // image setting) and fall back to the text ai_provider.
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("ai_provider, image_ai_provider, image_ai_model")
      .eq("user_id", user.id)
      .single();

    if (!profileData) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2026-05-12 — provider resolution + sensible default. Order of preference:
    //   1. Per-request override from the dialog
    //   2. user_profiles.image_ai_provider (explicitly chosen)
    //   3. user_profiles.ai_provider (text provider, when image-capable)
    //   4. "openai" — system default for users whose text provider can't
    //      do image gen (anthropic, perplexity) or who never configured one.
    //      The gateway path makes this work without any per-provider env keys.
    // Step 4 also auto-populates `image_ai_provider` in user_profiles so the
    // user sees "OpenAI" in Settings the next time they look — preventing a
    // hidden runtime fallback that doesn't match the UI state.
    const IMAGE_CAPABLE_PROVIDERS: AIProvider[] = ["openai", "google"];
    let provider: AIProvider;
    let needsImageProviderBackfill = false;
    if (requestProvider) {
      provider = requestProvider as AIProvider;
    } else if (profileData.image_ai_provider) {
      provider = profileData.image_ai_provider as AIProvider;
    } else if (
      profileData.ai_provider &&
      IMAGE_CAPABLE_PROVIDERS.includes(profileData.ai_provider as AIProvider)
    ) {
      provider = profileData.ai_provider as AIProvider;
      needsImageProviderBackfill = true;
    } else {
      provider = "openai";
      needsImageProviderBackfill = true;
    }
    const imageModel = requestModel || profileData.image_ai_model;
    imgProvider = provider;
    imgModel = imageModel;
    userId = user.id;

    // BP-125: reject image-gen for providers that don't support image models
    // (Anthropic, Perplexity). This catches per-request overrides that name
    // a non-image-capable provider explicitly — the auto-default above already
    // rescues empty/anthropic profile state by picking openai.
    if (!IMAGE_CAPABLE_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          error: `${provider} doesn't support image generation. Configure an image-capable provider (OpenAI or Google) under Settings → AI Model → Image Generation.`,
          reason: "provider_not_image_capable",
          provider,
        },
        { status: 400 }
      );
    }

    // 2026-05-12 — tier gate on premium image models. Free / Personal are
    // restricted to BASIC_IMAGE_MODELS for the selected provider; Pro+ has
    // the full catalog. /api/models filters the picker, but a stale client
    // could still POST a premium model — reject those here as defense in depth.
    if (imageModel) {
      const tierForGate = await getUserTier(user.id);
      const hasPremiumModels = hasFeature(tierForGate, "premium_image_models");
      if (!hasPremiumModels) {
        const allowed = BASIC_IMAGE_MODELS[provider] ?? [];
        if (!allowed.includes(imageModel)) {
          return NextResponse.json(
            {
              error: `"${imageModel}" requires the Professional plan. Choose one of the available models for your plan or upgrade.`,
              reason: "model_tier_gated",
              model: imageModel,
              requiredTier: "professional",
            },
            { status: 403 }
          );
        }
      }
    }

    // BP-045 follow-up: system-first with BYOK image-key fallback.
    // resolveImageProvider runs the system-path quota + budget checks and
    // returns either the AI Gateway, a per-provider system env key, or a
    // BYOK image key. 2026-05-12: gateway path added so the system route
    // works on Vercel without SYSTEM_AI_KEY_OPENAI / SYSTEM_AI_KEY_GOOGLE.
    const imgResult = await resolveImageProvider(provider);
    if (!imgResult.ok) {
      return NextResponse.json(imgResult.block.body, {
        status: imgResult.block.status,
      });
    }
    const { apiKey, source, isFallback, baseURL } = imgResult.resolution;
    console.log(
      `[Image Gen] ${provider} via ${source}${isFallback ? " (fallback)" : ""}`,
    );

    // 2026-05-12 — Google through the gateway routes via the OpenAI-compatible
    // base URL using `google/${model}` namespacing (the gateway translates).
    // BYOK Google users hit the direct Generative Language API branch below.
    // The unified "gateway path" is handled in the OpenAI branch — we route
    // both providers through openai.images.generate when source === "gateway".
    const hook = post.content?.slice(0, 210) ?? "";
    const selectedStyle = artStyle || ART_STYLES[0];
    const format = imageFormat || "landscape";
    const formatDesc = format === "square"
      ? "square format (1:1, 1080x1080)"
      : "landscape format (16:9, 1920x1080)";

    // Build the image generation prompt
    const textInstruction = includeText && imageText
      ? `Include the following text prominently in the image: "${imageText}".`
      : "Do NOT include any text, words, letters, or numbers in the image.";

    const basePrompt = customPrompt ||
      `Generate an image for a social media post. The image should visually represent the mood, energy, and themes of this topic — do NOT render the topic text itself in the image. Topic: ${post.title || "a LinkedIn post"}. Thematic context: ${hook}`;

    const imagePrompt = `${basePrompt} ${formatDesc}. In the style of: ${selectedStyle}. ${textInstruction}`;

    let imageUrl: string;
    let storagePath: string;
    // Unique suffix per generation so the storage path is different each time
    const genId = Date.now();

    // 2026-05-12 — Unified gateway path. When source === "gateway" we route
    // BOTH openai and google through the OpenAI-compatible gateway endpoint
    // (https://ai-gateway.vercel.sh/v1) with provider-namespaced model IDs
    // ("openai/gpt-5-nano", "google/gemini-3-pro-image"). The gateway
    // translates internally. BYOK Google falls through to the native
    // Generative Language API branch below since gateway routing requires
    // the gateway key, not a Google key.
    const useOpenAIShape = source === "gateway" || provider === "openai";

    if (useOpenAIShape) {
      const openai = new OpenAI(
        baseURL ? { apiKey, baseURL } : { apiKey }
      );
      // Per-provider defaults; per-user image_ai_model preference wins when set.
      // gpt-5-nano leads OpenAI (owner direction 2026-05-12: lower cost +
      // more capable than gpt-image-*). gemini-3.1-flash-image-preview leads
      // Google.
      const defaultModel =
        provider === "google" ? "gemini-3.1-flash-image-preview" : "gpt-5-nano";
      const rawModel = imageModel || defaultModel;
      const selectedModel =
        source === "gateway" && !rawModel.includes("/")
          ? `${provider}/${rawModel}`
          : rawModel;
      const isGptImage = rawModel.startsWith("gpt-image-");
      // size + quality are legacy Images-API params. The gpt-image-* family
      // still accepts them. GPT-5 multimodal + every Google model reject
      // them — let the gateway/API pick defaults instead.
      const supportsImagesApiParams = provider === "openai" && isGptImage;

      const generateParams: Record<string, unknown> = {
        model: selectedModel,
        prompt: imagePrompt,
        n: 1,
      };

      if (supportsImagesApiParams) {
        generateParams.size = format === "square" ? "1024x1024" : "1536x1024";
        generateParams.quality = "auto";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await openai.images.generate(generateParams as any, { signal });

      // If the client aborted while waiting for the provider response, bail out
      // before touching storage or DB. OpenAI aborts before billing when the
      // signal fires before it returns a response.
      if (signal.aborted) {
        return new Response(null, { status: 499 });
      }

      const imageData = (response as { data: Array<{ url?: string; b64_json?: string }> }).data[0];
      if (imageData?.url) {
        // DALL-E returns a temporary URL — download and store to Supabase
        const imageRes = await fetch(imageData.url);
        if (!imageRes.ok) throw new Error("Failed to download image from OpenAI");
        const buffer = await imageRes.arrayBuffer();

        if (signal.aborted) {
          return new Response(null, { status: 499 });
        }

        const contentType = imageRes.headers.get("content-type") || "image/png";
        const ext = contentType.includes("png") ? "png" : "jpg";
        storagePath = `${user.id}/${postId}/generated-${genId}.${ext}`;

        await supabase.storage
          .from("post-images")
          .upload(storagePath, buffer, { contentType, upsert: true });
        uploadedStoragePath = storagePath;

        if (signal.aborted) {
          // File was already uploaded — clean it up
          await supabase.storage.from("post-images").remove([storagePath]);
          return new Response(null, { status: 499 });
        }

        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(storagePath);
        imageUrl = urlData.publicUrl;
      } else if (imageData?.b64_json) {
        if (signal.aborted) {
          return new Response(null, { status: 499 });
        }

        const buffer = Buffer.from(imageData.b64_json, "base64");
        storagePath = `${user.id}/${postId}/generated-${genId}.png`;
        await supabase.storage
          .from("post-images")
          .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
        uploadedStoragePath = storagePath;

        if (signal.aborted) {
          // File was already uploaded — clean it up
          await supabase.storage.from("post-images").remove([storagePath]);
          return new Response(null, { status: 499 });
        }

        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(storagePath);
        imageUrl = urlData.publicUrl;
      } else {
        throw new Error("OpenAI did not return an image");
      }
    } else if (provider === "google") {
      // BYOK Google direct path — uses the Generative Language REST API
      // with the user's own Google API key. Gateway-routed Google requests
      // hit the unified openai.images.generate branch above instead.
      const selectedModel = imageModel || "gemini-3.1-flash-image-preview";

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: imagePrompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
          signal,
        }
      );

      if (signal.aborted) {
        return new Response(null, { status: 499 });
      }

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Google image generation failed: ${errText}`);
      }

      const geminiData = await geminiRes.json();

      if (signal.aborted) {
        return new Response(null, { status: 499 });
      }

      const parts = geminiData.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith("image/")
      );

      if (!imagePart?.inlineData?.data) {
        throw new Error("Google did not return an image. Try a different model or prompt.");
      }

      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      const mimeType = imagePart.inlineData.mimeType || "image/png";
      const ext = mimeType.includes("png") ? "png" : "jpg";
      storagePath = `${user.id}/${postId}/generated-${genId}.${ext}`;

      await supabase.storage
        .from("post-images")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
      uploadedStoragePath = storagePath;

      if (signal.aborted) {
        // File was already uploaded — clean it up
        await supabase.storage.from("post-images").remove([storagePath]);
        return new Response(null, { status: 499 });
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(storagePath);
      imageUrl = urlData.publicUrl;
    } else {
      return NextResponse.json(
        { error: `Image generation is not available for ${provider}. Supported providers: OpenAI and Google.` },
        { status: 400 }
      );
    }

    // Final abort check before writing to DB and incrementing quota.
    // If the client disconnected after the provider returned but before we
    // committed, clean up the uploaded file and return without debiting quota.
    if (signal.aborted) {
      if (uploadedStoragePath) {
        await supabase.storage.from("post-images").remove([uploadedStoragePath]);
      }
      return new Response(null, { status: 499 });
    }

    // Insert version row (do NOT update the post — that happens when user clicks "Use This Image")
    const { data: version, error: versionError } = await supabase
      .from("post_image_versions")
      .insert({
        post_id: postId,
        user_id: user.id,
        storage_path: storagePath,
        image_url: imageUrl,
        prompt: imagePrompt,
        source: "ai",
      })
      .select("id")
      .single();

    if (versionError) {
      logApiError("api/ai/generate-image (version insert)", versionError);
    }

    // System counters only advance for system-path traffic — BYOK
    // fallback (`isFallback === true`) doesn't consume system quota.
    if (!isFallback) {
      await incrementQuota(user.id, "image_generations");
    }

    // 2026-05-12 — when the route inferred a default provider (because the
    // user had no image_ai_provider set, or their text provider couldn't do
    // images), backfill the choice on user_profiles so Settings reflects
    // the actual provider being used. Non-fatal if it fails — the gen
    // succeeded and the next request will retry the same inference.
    if (needsImageProviderBackfill) {
      const { error: backfillError } = await supabase
        .from("user_profiles")
        .update({ image_ai_provider: provider })
        .eq("user_id", user.id);
      if (backfillError) {
        logApiError("api/ai/generate-image (image_ai_provider backfill)", backfillError);
      }
    }

    logAiUsage({
      userId: user.id,
      route: "generate-image",
      provider,
      model: imageModel ?? "unknown",
      source,
      success: true,
      imageCount: 1,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({
      imageUrl,
      storagePath,
      versionId: version?.id ?? null,
      prompt: imagePrompt,
    });
  } catch (error) {
    // AbortError means the client cancelled. Don't log as an error, don't
    // debit quota. Any partially-uploaded file is tracked in uploadedStoragePath
    // and cleaned up here so nothing lingers in storage.
    if (error instanceof Error && error.name === "AbortError") {
      if (uploadedStoragePath) {
        try {
          const supabase = await createClient();
          await supabase.storage.from("post-images").remove([uploadedStoragePath]);
        } catch {
          // Best-effort cleanup — don't surface storage errors to the client
        }
      }
      return new Response(null, { status: 499 });
    }

    logApiError("api/ai/generate-image", error);

    logAiUsage({
      userId: userId ?? "unknown",
      route: "generate-image",
      provider: imgProvider ?? "unknown",
      model: imgModel ?? "unknown",
      source: "byok",
      success: false,
      errorCode: classifyAiError(error),
      latencyMs: Date.now() - startTime,
    });

    const msg =
      error instanceof Error ? error.message : "Failed to generate image";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Return available art styles
export async function GET() {
  return NextResponse.json({ styles: ART_STYLES });
}
