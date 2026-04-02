import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  ENHANCE_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { EnhanceInputSchema, logApiError, humanizeAIError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
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

    const humanized = humanizeAIError(error);
    return new Response(
      JSON.stringify({ error: humanized.message, action: humanized.action }),
      { status: humanized.status, headers: { "Content-Type": "application/json" } }
    );
  }
}
