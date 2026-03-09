import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  ENHANCE_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, instruction } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Post content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!instruction) {
      return new Response(
        JSON.stringify({ error: "Enhancement instruction is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
    console.error("Enhance API error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to enhance post";
    const status = message === "Unauthorized" ? 401 : message.includes("profile") ? 400 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
