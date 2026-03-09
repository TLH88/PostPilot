import { NextRequest, NextResponse } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  HASHTAG_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, count = 5 } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Post content is required" },
        { status: 400 }
      );
    }

    const { client, profile } = await getUserAIClient();

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      HASHTAG_INSTRUCTIONS,
      GUARDRAILS
    );

    const response = await client.createMessage({
      systemPrompt,
      messages: [
        {
          role: "user",
          content: `Suggest ${count} relevant hashtags for this LinkedIn post:\n\n${content}`,
        },
      ],
      maxTokens: 500,
    });

    // Parse JSON from AI response
    const rawText = response.text.trim();

    let jsonString = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonString);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Hashtags API error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to generate hashtags";
    const status = message === "Unauthorized" ? 401 : message.includes("profile") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
