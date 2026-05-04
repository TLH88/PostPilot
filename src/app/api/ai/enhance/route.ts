import { NextRequest } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  ENHANCE_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { EnhanceInputSchema, logApiError, humanizeAIError } from "@/lib/api-utils";
import { checkQuota, incrementQuota, buildQuotaExceededResponse } from "@/lib/quota";
import { logAiUsage, classifyAiError } from "@/lib/ai/usage-logger";
import { ENHANCEMENT_TEMPLATES } from "@/lib/ai/enhancement-templates";

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
  const startTime = Date.now();
  try {
    const body = await request.json();

    const parsed = EnhanceInputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { content, instruction, template } = parsed.data;

    // BP-028: if a template key is provided, use its pre-built prompt.
    // Otherwise fall back to the caller-supplied instruction (backwards-compat).
    const effectiveInstruction = template
      ? ENHANCEMENT_TEMPLATES[template].prompt
      : instruction;

    const { client, profile, source, provider, model } = await getUserAIClient();
    activeProvider = provider;

    // Quota check — BYOK users bypass the system-key cap.
    const bypass = source === "byok";
    const quota = await checkQuota(profile.user_id, "chat_messages", { bypass });
    if (!quota.allowed) {
      return buildQuotaExceededResponse(quota, "chat_messages");
    }

    await incrementQuota(profile.user_id, "chat_messages", { bypass });

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      ENHANCE_INSTRUCTIONS,
      GUARDRAILS
    );

    const userMessage = `Post to improve:\n${content}\n\nInstruction: ${effectiveInstruction}`;

    const readable = await client.createStream({
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2000,
      onFinish: (result) => {
        logAiUsage({
          userId: profile.user_id,
          route: "enhance",
          provider,
          model,
          source,
          usage: result.usage,
          generationId: result.generationId,
          success: true,
          latencyMs: Date.now() - startTime,
          // BP-028: log which template was used (undefined when generic fallback)
          metadata: template ? { template } : undefined,
        });
      },
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

    logAiUsage({
      userId: "unknown",
      route: "enhance",
      provider: activeProvider ?? "unknown",
      model: "unknown",
      source: "gateway",
      success: false,
      errorCode: classifyAiError(error),
      latencyMs: Date.now() - startTime,
    });

    const humanized = humanizeAIError(error, activeProvider);
    return new Response(
      JSON.stringify({ error: humanized.message, action: humanized.action, isCreditError: humanized.isCreditError, providerName: humanized.providerName, billingUrl: humanized.billingUrl }),
      { status: humanized.status, headers: { "Content-Type": "application/json" } }
    );
  }
}
