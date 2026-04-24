import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  CHAT_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { ChatInputSchema, logApiError, humanizeAIError } from "@/lib/api-utils";
import { checkQuota, incrementQuota, buildQuotaExceededResponse } from "@/lib/quota";
import { logAiUsage, classifyAiError } from "@/lib/ai/usage-logger";

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
  const startTime = Date.now();
  try {
    const body = await request.json();

    const parsed = ChatInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, postContent, postTitle, postStatus, contentPillar, hashtags, wordCount, characterCount } = parsed.data;

    const { client, profile, source, provider, model } = await getUserAIClient();
    activeProvider = provider;

    // Quota check — BYOK users bypass the system-key cap.
    const bypass = source === "byok";
    const quota = await checkQuota(profile.user_id, "chat_messages", { bypass });
    if (!quota.allowed) {
      return buildQuotaExceededResponse(quota, "chat_messages");
    }

    // Increment quota before streaming (optimistic; no-op for BYOK)
    await incrementQuota(profile.user_id, "chat_messages", { bypass });

    // Build system prompt with optional post context
    let additionalContext: string | undefined;
    if (postContent || postTitle) {
      const parts: string[] = [];
      if (postTitle) parts.push(`Post title: "${postTitle}"`);
      if (postStatus) parts.push(`Current status: ${postStatus}`);
      if (contentPillar) parts.push(`Content pillar: ${contentPillar}`);
      if (hashtags?.length) parts.push(`Hashtags: ${hashtags.join(", ")}`);
      if (characterCount) parts.push(`Character count: ${characterCount}/3000`);
      if (postContent) parts.push(`Current draft:\n---\n${postContent}\n---`);
      additionalContext = `The creator is working on a LinkedIn post. Here's the current state:\n${parts.join("\n")}`;
    }

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      CHAT_INSTRUCTIONS,
      GUARDRAILS,
      additionalContext
    );

    const readable = await client.createStream({
      systemPrompt,
      messages: messages.map(
        (msg: { role: "user" | "assistant"; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })
      ),
      maxTokens: 2000,
      onFinish: (result) => {
        logAiUsage({
          userId: profile.user_id,
          route: "chat",
          provider,
          model,
          source,
          usage: result.usage,
          generationId: result.generationId,
          success: true,
          latencyMs: Date.now() - startTime,
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logApiError("api/ai/chat", error);

    logAiUsage({
      userId: "unknown",
      route: "chat",
      provider: activeProvider ?? "unknown",
      model: "unknown",
      source: "gateway",
      success: false,
      errorCode: classifyAiError(error),
      latencyMs: Date.now() - startTime,
    });

    const humanized = humanizeAIError(error, activeProvider);
    return new Response(
      JSON.stringify({ error: humanized.message, action: humanized.action, isCreditError: humanized.isCreditError, providerName: humanized.providerName, billingUrl: humanized.billingUrl }),
      { status: humanized.status, headers: { "Content-Type": "application/json" } }
    );
  }
}
