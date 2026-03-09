import { NextRequest, NextResponse } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  BRAINSTORM_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, contentPillar, count = 5 } = body;

    const { client, profile } = await getUserAIClient();

    // Interpolate {count} in brainstorm instructions
    const interpolatedInstructions = BRAINSTORM_INSTRUCTIONS.replace(
      /\{count\}/g,
      String(count)
    );

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      interpolatedInstructions,
      GUARDRAILS
    );

    // Build user message
    let userMessage = `Generate ${count} LinkedIn post ideas for me.`;
    if (topic) {
      userMessage += ` Focus on this topic: ${topic}.`;
    }
    if (contentPillar) {
      userMessage += ` Align with my content pillar: ${contentPillar}.`;
    }

    const response = await client.createMessage({
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2000,
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
    console.error("Brainstorm API error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to generate ideas";
    const status = message === "Unauthorized" ? 401 : message.includes("profile") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
