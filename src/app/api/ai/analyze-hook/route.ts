import { NextRequest, NextResponse } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  HOOK_ANALYSIS_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { HookAnalysisInputSchema, HookAnalysisResponseSchema, logApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = HookAnalysisInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { content } = parsed.data;

    const { client, profile } = await getUserAIClient();

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      HOOK_ANALYSIS_INSTRUCTIONS,
      GUARDRAILS
    );

    const hook = content.slice(0, 210);

    const response = await client.createMessage({
      systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyze this LinkedIn post hook (first ~210 characters):\n\n"${hook}"\n\nFull post for context:\n${content}`,
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

    const rawParsed = JSON.parse(jsonString);

    const validated = HookAnalysisResponseSchema.safeParse(rawParsed);
    if (!validated.success) {
      logApiError("api/ai/analyze-hook:response-validation", validated.error);
      return NextResponse.json(
        { error: "AI returned an unexpected response format" },
        { status: 500 }
      );
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    logApiError("api/ai/analyze-hook", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to analyze hook";
    const status = message === "Unauthorized" ? 401 : message.includes("profile") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
