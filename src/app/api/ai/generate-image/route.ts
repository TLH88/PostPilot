import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviderApiKey } from "@/lib/ai/get-user-ai-client";
import { logApiError } from "@/lib/api-utils";
import { checkQuota, incrementQuota } from "@/lib/quota";
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

    // Fetch post content for auto-prompt
    const { data: post } = await supabase
      .from("posts")
      .select("title, content")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get profile to determine provider
    const { data: profileData } = await supabase
      .from("creator_profiles")
      .select("ai_provider, ai_model")
      .eq("user_id", user.id)
      .single();

    if (!profileData) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const provider = (requestProvider || profileData.ai_provider) as AIProvider;
    const imageModel = requestModel;

    // Get API key for the selected provider
    let apiKey: string;
    try {
      const result = await getProviderApiKey(provider);
      apiKey = result.apiKey;
    } catch {
      return NextResponse.json(
        { error: `No API key configured for ${provider}. Please add it in Settings.` },
        { status: 400 }
      );
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

    // Always append format, style, and text instructions — even when the user provides a custom prompt.
    // The client sends the base prompt (which may be user-edited), and we add the structured directives here.
    const basePrompt = customPrompt ||
      `Generate an image for a social media post. The image should visually represent the mood, energy, and themes of this topic — do NOT render the topic text itself in the image. Topic: ${post.title || "a LinkedIn post"}. Thematic context: ${hook}`;

    const imagePrompt = `${basePrompt} ${formatDesc}. In the style of: ${selectedStyle}. ${textInstruction}`;

    let imageUrl: string;

    if (provider === "openai") {
      // OpenAI — use DALL-E 3 natively
      const openai = new OpenAI({ apiKey });
      const selectedModel = imageModel || "gpt-image-1";
      const isDallE = selectedModel.startsWith("dall-e");

      // DALL-E and GPT Image models have different supported params
      const generateParams: Record<string, unknown> = {
        model: selectedModel,
        prompt: imagePrompt,
        n: 1,
      };

      if (isDallE) {
        // DALL-E 2 only supports 1024x1024; DALL-E 3 supports landscape
        generateParams.size = selectedModel === "dall-e-2"
          ? "1024x1024"
          : format === "square" ? "1024x1024" : "1792x1024";
        generateParams.quality = "standard";
      } else {
        // gpt-image-1, gpt-image-1.5, gpt-image-1-mini
        generateParams.size = format === "square" ? "1024x1024" : "1536x1024";
        generateParams.quality = "auto";
      }

      const response = await openai.images.generate(generateParams as Parameters<typeof openai.images.generate>[0]);

      const imageData = response.data[0];
      if (imageData?.url) {
        imageUrl = imageData.url;
      } else if (imageData?.b64_json) {
        // gpt-image-1 returns base64 — store to Supabase
        const buffer = Buffer.from(imageData.b64_json, "base64");
        const storagePath = `${user.id}/${postId}/generated.png`;
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
      // Google Gemini — use native generateContent endpoint with image output
      const selectedModel = imageModel || "gemini-3.1-flash-image-preview";

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: imagePrompt }],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Google image generation failed: ${errText}`);
      }

      const geminiData = await geminiRes.json();

      // Find the image part in the response
      const parts = geminiData.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith("image/")
      );

      if (!imagePart?.inlineData?.data) {
        throw new Error("Google did not return an image. Try a different model or prompt.");
      }

      // Store base64 image to Supabase
      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      const mimeType = imagePart.inlineData.mimeType || "image/png";
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const storagePath = `${user.id}/${postId}/generated.${ext}`;

      await supabase.storage
        .from("post-images")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(storagePath);

      imageUrl = urlData.publicUrl;
    } else {
      return NextResponse.json(
        {
          error: `Image generation is not available for ${provider}. Supported providers: OpenAI and Google.`,
        },
        { status: 400 }
      );
    }

    // For OpenAI, download the image and store in Supabase
    // (Google already stores directly from base64 above)
    if (provider === "openai" && imageUrl.startsWith("http")) {
      const imageRes = await fetch(imageUrl);
      if (imageRes.ok) {
        const buffer = await imageRes.arrayBuffer();
        const contentType =
          imageRes.headers.get("content-type") || "image/png";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const storagePath = `${user.id}/${postId}/generated.${ext}`;

        await supabase.storage
          .from("post-images")
          .upload(storagePath, buffer, {
            contentType,
            upsert: true,
          });

        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(storagePath);

        imageUrl = urlData.publicUrl;

        // Update post record
        await supabase
          .from("posts")
          .update({
            image_url: imageUrl,
            image_storage_path: storagePath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId);
      }
    } else if (provider === "google") {
      // Already uploaded to Supabase above, update post record
      const ext = "png";
      const storagePath = `${user.id}/${postId}/generated.${ext}`;

      await supabase
        .from("posts")
        .update({
          image_url: imageUrl,
          image_storage_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
    }

    await incrementQuota(user.id, "chat_messages");

    return NextResponse.json({
      imageUrl,
      prompt: imagePrompt,
    });
  } catch (error) {
    logApiError("api/ai/generate-image", error);

    const msg =
      error instanceof Error ? error.message : "Failed to generate image";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Return available art styles
export async function GET() {
  return NextResponse.json({ styles: ART_STYLES });
}
