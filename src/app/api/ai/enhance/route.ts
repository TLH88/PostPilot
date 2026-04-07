import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  ENHANCE_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { EnhanceInputSchema, logApiError, humanizeAIError } from "@/lib/api-utils";
import { checkQuota, incrementQuota } from "@/lib/quota";

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
  try {
    const body = await request.json();

    const parsed = EnhanceInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { content, instruction } = parsed.data;

    const { client, profile } = await getUserAIClient();
    activeProvider = profile.ai_provider ?? undefined;

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
      ENHANCE_INSTRUCTIONS,
      GUARDRAILS
    );

    const userMessage = `Post to improve:\n${content}\n\nInstruction: ${instruction}`;

    const readable = await client.createStream({
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2000,
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logApiError("api/ai/enhance", error);

    const humanized = humanizeAIError(error, activeProvider);
    return new Response(
      JSON.stringify({ error: humanized.message, action: humanized.action, isCreditError: humanized.isCreditError, providerName: humanized.providerName, billingUrl: humanized.billingUrl }),
      { status: humanized.status, headers: { "Content-Type": "application/json" } }
    );
  }
}
