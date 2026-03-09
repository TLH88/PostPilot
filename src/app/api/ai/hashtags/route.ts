import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/anthropic";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  HASHTAG_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import type { CreatorProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { content, count = 5 } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Post content is required" },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch creator profile
    const { data: profile, error: profileError } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Please complete your profile first" },
        { status: 400 }
      );
    }

    const creatorProfile = profile as CreatorProfile;

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(creatorProfile),
      HASHTAG_INSTRUCTIONS,
      GUARDRAILS
    );

    // Call Claude API (non-streaming since we need JSON)
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Suggest ${count} relevant hashtags for this LinkedIn post:\n\n${content}`,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON from Claude's response
    const rawText = textBlock.text.trim();

    // Try to extract JSON from the response (handle potential markdown code blocks)
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

    return NextResponse.json(
      { error: "Failed to generate hashtags" },
      { status: 500 }
    );
  }
}
