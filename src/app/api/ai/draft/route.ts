import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  DRAFT_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { DraftInputSchema, logApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
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

    const { client, profile } = await getUserAIClient();

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

    const message =
      error instanceof Error ? error.message : "Failed to generate draft";
    const status = message === "Unauthorized" ? 401 : message.includes("profile") ? 400 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
