import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviderApiKey } from "@/lib/ai/get-user-ai-client";
import { logApiError } from "@/lib/api-utils";
import { checkQuota, incrementQuota } from "@/lib/quota";
import { logAiUsage, classifyAiError } from "@/lib/ai/usage-logger";
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

    // Quota check
    const quota = await checkQuota(user.id, "chat_messages");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Monthly AI message limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more.` },
        { status: 403 }
      );
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
      .from("creator_profiles")
      .select("ai_provider, image_ai_provider, image_ai_model")
      .eq("user_id", user.id)
      .single();

    if (!profileData) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const provider = (requestProvider ||
      profileData.image_ai_provider ||
      profileData.ai_provider) as AIProvider;
    const imageModel = requestModel || profileData.image_ai_model;
    imgProvider = provider;
    imgModel = imageModel;
    userId = user.id;

    // Get API key for the selected provider — look up image keys first
    // (key_type='image' in ai_provider_keys), then fall back to text keys
    // so users with only a text key configured can still generate images.
    let apiKey: string;
    try {
      const result = await getProviderApiKey(provider, "image");
      apiKey = result.apiKey;
      console.log(`[Image Gen] Using image-type key for ${provider}`);
    } catch {
      try {
        const result = await getProviderApiKey(provider, "text");
        apiKey = result.apiKey;
        console.log(`[Image Gen] Falling back to text-type key for ${provider}`);
      } catch {
        return NextResponse.json(
          { error: `No API key configured for ${provider}. Please add it in Settings.` },
          { status: 400 }
        );
      }
    }
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

    if (provider === "openai") {
      const openai = new OpenAI({ apiKey });
      const selectedModel = imageModel || "gpt-image-1";
      const isDallE = selectedModel.startsWith("dall-e");

      const generateParams: Record<string, unknown> = {
        model: selectedModel,
        prompt: imagePrompt,
        n: 1,
      };

      if (isDallE) {
        generateParams.size = selectedModel === "dall-e-2"
          ? "1024x1024"
          : format === "square" ? "1024x1024" : "1792x1024";
        generateParams.quality = "standard";
      } else {
        generateParams.size = format === "square" ? "1024x1024" : "1536x1024";
        generateParams.quality = "auto";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await openai.images.generate(generateParams as any);

      const imageData = (response as { data: Array<{ url?: string; b64_json?: string }> }).data[0];
      if (imageData?.url) {
        // DALL-E returns a temporary URL — download and store to Supabase
        const imageRes = await fetch(imageData.url);
        if (!imageRes.ok) throw new Error("Failed to download image from OpenAI");
        const buffer = await imageRes.arrayBuffer();
        const contentType = imageRes.headers.get("content-type") || "image/png";
        const ext = contentType.includes("png") ? "png" : "jpg";
        storagePath = `${user.id}/${postId}/generated-${genId}.${ext}`;

        await supabase.storage
          .from("post-images")
          .upload(storagePath, buffer, { contentType, upsert: true });

        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(storagePath);
        imageUrl = urlData.publicUrl;
      } else if (imageData?.b64_json) {
        const buffer = Buffer.from(imageData.b64_json, "base64");
        storagePath = `${user.id}/${postId}/generated-${genId}.png`;
        await supabase.storage
          .from("post-images")
          .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(storagePath);
        imageUrl = urlData.publicUrl;
      } else {
        throw new Error("OpenAI did not return an image");
      }
    } else if (provider === "google") {
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
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Google image generation failed: ${errText}`);
      }

      const geminiData = await geminiRes.json();
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

    await incrementQuota(user.id, "chat_messages");

    logAiUsage({
      userId: user.id,
      route: "generate-image",
      provider,
      model: imageModel ?? "unknown",
      source: "byok",
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
