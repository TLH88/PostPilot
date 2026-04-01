import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  CHAT_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { ChatInputSchema, logApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = ChatInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, postContent, postTitle } = parsed.data;

    const { client, profile } = await getUserAIClient();

    // Build system prompt with optional post context
    let additionalContext: string | undefined;
    if (postContent) {
      const title = postTitle ? ` titled '${postTitle}'` : "";
      additionalContext = `The creator is working on a post${title}. Current draft:\n---\n${postContent}\n---`;
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

    const message =
      error instanceof Error ? error.message : "Failed to process chat";
    const status = message === "Unauthorized" ? 401 : message.includes("profile") ? 400 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
