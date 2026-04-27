/**
 * AI Usage Logger — BP-085 Phase 1.
 *
 * Logs every AI request to the ai_usage_events table with normalized cost,
 * token counts, and provider metadata. Fire-and-forget from the caller's
 * perspective: the user's request is never blocked by logging failures.
 *
 * Failure handling:
 * - All DB errors are caught and logged via logApiError (visible in server logs)
 * - A module-level counter tracks consecutive failures
 * - After 5 consecutive failures, inserts a critical ai_usage_alerts row
 *   so the admin is notified that usage logging has broken down
 * - Counter resets to 0 on first success
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";
import { estimateTokenCostUsd, estimateImageCostUsd, estimateCachedSavingsUsd } from "./cost-table";
import type { AIProvider, AIUsageData } from "./providers";

// ── Types ──────────────────────────────────────────────────────────────────

export interface UsageEventInput {
  userId: string;
  workspaceId?: string | null;
  route: string;
  provider: AIProvider | string;
  model: string;
  source: "gateway" | "byok" | "system_key";
  usage?: AIUsageData;
  costUsd?: number;
  cachedSavingsUsd?: number;
  costSource?: "gateway_exact" | "provider_sdk" | "estimated";
  attemptedProviders?: string[];
  finalProvider?: string;
  success: boolean;
  errorCode?: string;
  generationId?: string;
  latencyMs?: number;
  imageCount?: number; // for generate-image route
  metadata?: Record<string, unknown>; // arbitrary per-route context (e.g. trending for brainstorm, template key for enhance)
}

// ── Consecutive failure tracking ───────────────────────────────────────────

let consecutiveFailures = 0;
const FAILURE_ALERT_THRESHOLD = 5;

// ── Main entry point (fire-and-forget) ─────────────────────────────────────

/**
 * Log an AI usage event. Call this without `await` — it runs asynchronously
 * and never throws. Failures are logged and tracked; after 5 consecutive
 * failures an alert row is inserted so the admin finds out.
 */
export function logAiUsage(input: UsageEventInput): void {
  // Don't await — fire and forget
  _logAiUsageAsync(input).catch(() => {
    // Outer safety net — should never reach here since _logAiUsageAsync
    // has its own try/catch, but just in case.
  });
}

async function _logAiUsageAsync(input: UsageEventInput): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Compute cost if not provided
    let costUsd = input.costUsd;
    let cachedSavingsUsd = input.cachedSavingsUsd;
    let costSource = input.costSource ?? "estimated";

    if (costUsd == null && input.usage && input.route !== "generate-image") {
      costUsd = estimateTokenCostUsd(input.provider, input.model, {
        inputTokens: input.usage.inputTokens,
        outputTokens: input.usage.outputTokens,
        cachedTokens: input.usage.cachedTokens,
      });
      costSource = input.source === "gateway" ? "gateway_exact" : "estimated";
    }

    if (costUsd == null && input.route === "generate-image") {
      costUsd = estimateImageCostUsd(
        input.provider,
        input.model,
        input.imageCount ?? 1
      );
      costSource = "estimated";
    }

    if (cachedSavingsUsd == null && input.usage?.cachedTokens) {
      cachedSavingsUsd = estimateCachedSavingsUsd(
        input.provider,
        input.model,
        input.usage.cachedTokens
      );
    }

    const { error } = await supabase.from("ai_usage_events").insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      route: input.route,
      provider: input.provider,
      model: input.model,
      source: input.source,
      input_tokens: input.usage?.inputTokens ?? null,
      output_tokens: input.usage?.outputTokens ?? null,
      cached_tokens: input.usage?.cachedTokens ?? null,
      reasoning_tokens: input.usage?.reasoningTokens ?? null,
      cost_usd: costUsd ?? null,
      cached_savings_usd: cachedSavingsUsd ?? null,
      cost_source: costSource,
      attempted_providers: input.attemptedProviders ?? null,
      final_provider: input.finalProvider ?? null,
      success: input.success,
      error_code: input.errorCode ?? null,
      generation_id: input.generationId ?? null,
      latency_ms: input.latencyMs ?? null,
      metadata: input.metadata ?? null,
    });

    if (error) {
      throw error;
    }

    // Reset consecutive failure counter on success
    consecutiveFailures = 0;
  } catch (err) {
    consecutiveFailures++;

    // Always log to server logs
    logApiError(
      `usage-logger:${input.route}:${input.userId}:failures=${consecutiveFailures}`,
      err
    );

    // After threshold, fire a critical alert so the admin notices
    if (consecutiveFailures === FAILURE_ALERT_THRESHOLD) {
      try {
        const supabase = createAdminClient();
        await supabase.from("ai_usage_alerts").insert({
          user_id: input.userId,
          kind: "logger_failure",
          severity: "critical",
          message: `Usage logger has failed ${FAILURE_ALERT_THRESHOLD} consecutive times. AI requests are succeeding but usage data is not being captured. Check server logs for details.`,
          context: {
            consecutiveFailures,
            lastRoute: input.route,
            lastProvider: input.provider,
          },
        });
      } catch {
        // If even the alert insert fails, we can only log to console
        console.error(
          `[CRITICAL] Usage logger alert insert also failed after ${FAILURE_ALERT_THRESHOLD} consecutive logging failures`
        );
      }
    }
  }
}

// ── Error classifier ───────────────────────────────────────────────────────

/**
 * Classify an AI provider error into a short code for the error_code column.
 * Used by route handlers when logging failed requests.
 */
export function classifyAiError(error: unknown): string {
  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("429") || msg.includes("too many"))
    return "rate_limit";
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid api key") || msg.includes("incorrect api"))
    return "auth";
  if (msg.includes("content") && (msg.includes("policy") || msg.includes("filter") || msg.includes("safety")))
    return "content_policy";
  if (msg.includes("timeout") || msg.includes("timed out"))
    return "timeout";
  if (msg.includes("overloaded") || msg.includes("503") || msg.includes("capacity"))
    return "overloaded";
  if (msg.includes("context") && (msg.includes("length") || msg.includes("window") || msg.includes("too long")))
    return "context_length";
  if (msg.includes("not found") || msg.includes("does not exist"))
    return "model_not_found";

  return "unknown";
}
