/**
 * Studio AI — Phase 1 review endpoint.
 *
 * POST /api/ai/review-draft
 *
 * Returns structured JSON with HOOK and CLOSE evaluations + insertable
 * suggestions. Powers the suggestion cards above the Post Pilot AI chat.
 *
 * Hard gates (per owner direction 2026-05-04):
 *   1. Tier must satisfy `byok_ai_keys` (Pro+/Team/Enterprise).
 *   2. The user MUST have BYOK keys configured — system-key / gateway
 *      paths are rejected. This is an "advanced AI" feature billed to the
 *      user's own provider account, never to PostPilot's gateway.
 *
 * On any rejection we return 402 with a `code` the client can branch on
 * to render the right empty state.
 *
 * Performance / cost guards:
 *   - In-memory content-hash cache per process (cold-start safe; warm
 *     re-requests for the same draft return immediately without an AI
 *     call). The client also rate-limits and day-caps further.
 *   - Quota is intentionally NOT counted under the system `chat_messages`
 *     bucket — BYOK pays for it, and the client enforces day caps.
 */

import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { getByokAIClient, ByokResolutionError } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { logApiError, humanizeAIError } from "@/lib/api-utils";
import { logAiUsage, classifyAiError } from "@/lib/ai/usage-logger";
import {
  REVIEW_INSTRUCTIONS,
  ReviewRequestSchema,
  ReviewResponseSchema,
  type ReviewResponse,
} from "@/lib/ai/review-prompts";
import { buildEmDashRule } from "@/lib/em-dash";

// In-memory cache: `${userId}:${postId}:${contentHash}` → ReviewResponse.
// Per-process; survives warm invocations on the same Vercel function
// instance, evaporates on cold start. Capped to keep memory bounded.
const reviewCache = new Map<string, { response: ReviewResponse; ts: number }>();
const CACHE_MAX_ENTRIES = 200;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function pruneCache() {
  if (reviewCache.size <= CACHE_MAX_ENTRIES) return;
  // Drop the oldest ~25% to amortize the work.
  const sorted = [...reviewCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
  const dropCount = Math.ceil(CACHE_MAX_ENTRIES * 0.25);
  for (let i = 0; i < dropCount; i++) reviewCache.delete(sorted[i][0]);
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/** Strip markdown code fences if the model wraps JSON despite instructions. */
function unwrapJson(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parsed = ReviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const { postId, content, title, contentPillar, allowEmDashes } = parsed.data;

    // Both gates (tier + BYOK key on file) live inside getByokAIClient.
    // The resolver intentionally ignores the user's `force_ai_gateway`
    // toggle — Advanced Insights always uses BYOK when a key is on file,
    // even if the user has the "use system AI" slider on for everyday chat.
    let client, profile, source, provider, model;
    try {
      ({ client, profile, source, provider, model } = await getByokAIClient());
    } catch (err) {
      if (err instanceof ByokResolutionError) {
        if (err.code === "TIER_GATE") {
          return new Response(
            JSON.stringify({
              error: "Advanced Insights is a Pro feature.",
              action: "Upgrade to Pro to unlock proactive draft reviews.",
              code: "tier_gate",
            }),
            { status: 402, headers: { "Content-Type": "application/json" } },
          );
        }
        if (err.code === "BYOK_REQUIRED") {
          return new Response(
            JSON.stringify({
              error: "Advanced Insights requires your own AI provider key.",
              action:
                "Add an API key for your AI provider in Settings to enable Advanced Insights.",
              code: "byok_required",
            }),
            { status: 402, headers: { "Content-Type": "application/json" } },
          );
        }
      }
      throw err;
    }
    activeProvider = provider;

    // ── Cache check ──────────────────────────────────────────────────────────
    // Cache key includes the em-dash flag — flipping the toggle should not
    // serve a stale review that obeyed the previous setting.
    const contentHash = hashContent(content);
    const cacheKey = `${profile.user_id}:${postId}:${contentHash}:${allowEmDashes === false ? "no-em" : "em-ok"}`;
    const cached = reviewCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ ...cached.response, contentHash, cached: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // ── Build prompt ─────────────────────────────────────────────────────────
    const contextParts: string[] = [];
    if (title) contextParts.push(`Post title: "${title}"`);
    if (contentPillar) contextParts.push(`Content pillar: ${contentPillar}`);
    contextParts.push(`Draft to review:\n---\n${content}\n---`);
    const additionalContext =
      `Review the following LinkedIn draft and return the JSON shape specified above.\n${contextParts.join("\n")}` +
      buildEmDashRule(allowEmDashes);

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      REVIEW_INSTRUCTIONS,
      GUARDRAILS,
      additionalContext,
    );

    // ── Call provider (non-streaming — we need the whole JSON object) ────────
    const aiResponse = await client.createMessage({
      systemPrompt,
      messages: [
        {
          role: "user",
          content:
            "Review this draft and return the JSON object. Output only JSON.",
        },
      ],
      maxTokens: 1500,
    });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(unwrapJson(aiResponse.text));
    } catch (err) {
      console.error("review-draft: model returned non-JSON", aiResponse.text.slice(0, 400), err);
      throw new Error("Model returned malformed JSON. Try again.");
    }

    const validated = ReviewResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.error("review-draft: schema validation failed", validated.error.issues);
      throw new Error("Model returned an unexpected shape. Try again.");
    }

    // Cache + return
    reviewCache.set(cacheKey, { response: validated.data, ts: Date.now() });
    pruneCache();

    logAiUsage({
      userId: profile.user_id,
      route: "review-draft",
      provider,
      model,
      source,
      usage: aiResponse.usage,
      generationId: aiResponse.generationId,
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ ...validated.data, contentHash, cached: false }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    logApiError("api/ai/review-draft", error);
    logAiUsage({
      userId: "unknown",
      route: "review-draft",
      provider: activeProvider ?? "unknown",
      model: "unknown",
      source: "byok",
      success: false,
      errorCode: classifyAiError(error),
      latencyMs: Date.now() - startTime,
    });
    const humanized = humanizeAIError(error, activeProvider);
    return new Response(
      JSON.stringify({
        error: humanized.message,
        action: humanized.action,
        isCreditError: humanized.isCreditError,
        providerName: humanized.providerName,
        billingUrl: humanized.billingUrl,
      }),
      { status: humanized.status, headers: { "Content-Type": "application/json" } },
    );
  }
}
