import { NextRequest, NextResponse } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  HASHTAG_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { HashtagsInputSchema, HashtagsResponseSchema, logApiError, humanizeAIError } from "@/lib/api-utils";
import { checkQuota, incrementQuota } from "@/lib/quota";

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
  try {
    const body = await request.json();

    const parsed = HashtagsInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { content, count } = parsed.data;

    const { client, profile } = await getUserAIClient();
    activeProvider = profile.ai_provider ?? undefined;

    // Quota check
    const quota = await checkQuota(profile.user_id, "chat_messages");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Monthly AI message limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more.` },
        { status: 403 }
      );
    }

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

    const rawParsed = JSON.parse(jsonString);

    const validated = HashtagsResponseSchema.safeParse(rawParsed);
    if (!validated.success) {
      logApiError("api/ai/hashtags:response-validation", validated.error);
      return NextResponse.json(
        { error: "AI returned an unexpected response format" },
        { status: 500 }
      );
    }

    await incrementQuota(profile.user_id, "chat_messages");
    return NextResponse.json(validated.data);
  } catch (error) {
    logApiError("api/ai/hashtags", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "The AI returned an unreadable response. Please try again.", action: "Try again — if this keeps happening, try a different AI model in Settings." },
        { status: 500 }
      );
    }

    const humanized = humanizeAIError(error, activeProvider);
    return NextResponse.json(
      { error: humanized.message, action: humanized.action, isCreditError: humanized.isCreditError, providerName: humanized.providerName, billingUrl: humanized.billingUrl },
      { status: humanized.status }
    );
  }
}
