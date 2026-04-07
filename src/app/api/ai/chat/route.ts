import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  CHAT_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { ChatInputSchema, logApiError, humanizeAIError } from "@/lib/api-utils";
import { checkQuota, incrementQuota } from "@/lib/quota";

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
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

    const { client, profile } = await getUserAIClient();
    activeProvider = profile.ai_provider ?? undefined;

    // Quota check
    const quota = await checkQuota(profile.user_id, "chat_messages");
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({ error: `Monthly AI chat limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more.` }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Increment quota before streaming (optimistic)
    await incrementQuota(profile.user_id, "chat_messages");

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

    const humanized = humanizeAIError(error, activeProvider);
    return new Response(
      JSON.stringify({ error: humanized.message, action: humanized.action, isCreditError: humanized.isCreditError, providerName: humanized.providerName, billingUrl: humanized.billingUrl }),
      { status: humanized.status, headers: { "Content-Type": "application/json" } }
    );
  }
}
