import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  DRAFT_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { DraftInputSchema, logApiError, humanizeAIError } from "@/lib/api-utils";
import { checkQuota, incrementQuota } from "@/lib/quota";
import { logAiUsage, classifyAiError } from "@/lib/ai/usage-logger";

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
  const startTime = Date.now();
  try {
    const body = await request.json();

    const parsed = DraftInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { ideaTitle, ideaDescription, topic, instructions, currentDraft } = parsed.data;

    const { client, profile, source, provider, model } = await getUserAIClient();
    activeProvider = provider;

    // Quota check
    const quota = await checkQuota(profile.user_id, "chat_messages");
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({ error: `Monthly AI message limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more.` }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    await incrementQuota(profile.user_id, "chat_messages");

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      DRAFT_INSTRUCTIONS,
      GUARDRAILS
    );

    // Build user message
    const messageParts: string[] = [];

    if (ideaTitle) {
      messageParts.push(`Post idea: ${ideaTitle}`);
    }
    if (ideaDescription) {
      messageParts.push(`Description: ${ideaDescription}`);
    }
    if (topic) {
      messageParts.push(`Topic: ${topic}`);
    }
    if (instructions) {
      messageParts.push(`Additional instructions: ${instructions}`);
    }
    if (currentDraft) {
      messageParts.push(`Current draft to improve:\n---\n${currentDraft}\n---`);
    }

    if (messageParts.length === 0) {
      messageParts.push("Write me a LinkedIn post based on my profile and expertise.");
    }

    const userMessage = messageParts.join("\n\n");

    const readable = await client.createStream({
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2000,
      onFinish: (result) => {
        logAiUsage({
          userId: profile.user_id,
          route: "draft",
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
    logApiError("api/ai/draft", error);

    logAiUsage({
      userId: "unknown",
      route: "draft",
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
