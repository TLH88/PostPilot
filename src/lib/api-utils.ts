import { z } from "zod";

// ─── Shared Zod schemas for API input validation ─────────────────────────────

export const DraftInputSchema = z.object({
  ideaTitle: z.string().optional(),
  ideaDescription: z.string().optional(),
  topic: z.string().optional(),
  instructions: z.string().optional(),
  currentDraft: z.string().optional(),
});

export const ChatInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1, "Messages array must have at least one message"),
  postContent: z.string().optional(),
  postTitle: z.string().optional(),
});

export const BrainstormInputSchema = z.object({
  topic: z.string().optional(),
  contentPillar: z.string().optional(),
  count: z.number().int().min(1).max(20).optional().default(5),
});

export const EnhanceInputSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  instruction: z.string().min(1, "Enhancement instruction is required"),
});

export const HashtagsInputSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  count: z.number().int().min(1).max(30).optional().default(5),
});

export const HookAnalysisInputSchema = z.object({
  content: z.string().min(1, "Post content is required"),
});

// ─── Zod schemas for AI response validation ──────────────────────────────────

export const BrainstormResponseSchema = z.array(
  z.object({
    title: z.string(),
    description: z.string().optional(),
    hook: z.string().optional(),
    suggestedPillar: z.string().optional(),
  })
);

export const HashtagsResponseSchema = z.array(z.string());

export const HookAnalysisResponseSchema = z.object({
  strength: z.enum(["strong", "moderate", "weak"]),
  score: z.number().min(1).max(10),
  technique: z.string(),
  feedback: z.string(),
  suggestion: z.string().optional(),
});

// ─── Sanitized error logging ─────────────────────────────────────────────────

const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /key-[a-zA-Z0-9_-]{20,}/g,
  /AIza[a-zA-Z0-9_-]{30,}/g,
  /pplx-[a-zA-Z0-9_-]{20,}/g,
  /[a-zA-Z0-9_-]{32,}/g, // generic long token fallback
];

/**
 * Sanitize a string by redacting potential API keys and tokens.
 */
function sanitizeString(str: string): string {
  let sanitized = str;
  for (const pattern of API_KEY_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

// ─── User-friendly AI error messages ────────────────────────────────────────

interface HumanizedError {
  message: string;
  action: string;
  status: number;
}

/**
 * Convert raw AI SDK errors into user-friendly messages with actionable next steps.
 * The raw error is still logged separately via logApiError().
 */
export function humanizeAIError(error: unknown): HumanizedError {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  // ── Auth & billing ────────────────────────────────────────────────────────
  if (lower.includes("credit balance") || lower.includes("purchase credits") || lower.includes("insufficient_quota") || lower.includes("billing")) {
    return {
      message: "Your AI provider account has run out of credits.",
      action: "Add credits in your AI provider's billing dashboard, or switch to a different provider in Settings.",
      status: 402,
    };
  }

  if (lower.includes("invalid api key") || lower.includes("invalid x-api-key") || lower.includes("incorrect api key") || lower.includes("authentication") || lower.includes("invalid_api_key")) {
    return {
      message: "Your API key is invalid or has been revoked.",
      action: "Go to Settings and re-enter your API key. Make sure you're copying the full key.",
      status: 401,
    };
  }

  if (raw === "Unauthorized") {
    return {
      message: "You need to be logged in to use this feature.",
      action: "Please log in and try again.",
      status: 401,
    };
  }

  if (lower.includes("no api key") || lower.includes("please add your api key")) {
    return {
      message: "No API key configured.",
      action: "Go to Settings and add your AI provider API key to get started.",
      status: 400,
    };
  }

  if (lower.includes("complete your profile") || lower.includes("profile first")) {
    return {
      message: "Your profile isn't set up yet.",
      action: "Complete your profile in the onboarding flow so the AI can match your voice and style.",
      status: 400,
    };
  }

  // ── Rate limits ───────────────────────────────────────────────────────────
  if (lower.includes("rate limit") || lower.includes("rate_limit") || lower.includes("too many requests") || lower.includes("429")) {
    return {
      message: "Too many requests — your AI provider is asking you to slow down.",
      action: "Wait a minute and try again. If this keeps happening, check your provider's rate limits.",
      status: 429,
    };
  }

  // ── Model / access issues ─────────────────────────────────────────────────
  if (lower.includes("model not found") || lower.includes("does not exist") || lower.includes("not_found_error") || lower.includes("invalid_model")) {
    return {
      message: "The selected AI model isn't available on your account.",
      action: "Go to Settings and choose a different model, or check that your API key has access to this model.",
      status: 400,
    };
  }

  if (lower.includes("overloaded") || lower.includes("capacity") || lower.includes("503") || lower.includes("service unavailable")) {
    return {
      message: "Your AI provider is temporarily overloaded.",
      action: "Try again in a few moments. If this persists, switch to a different AI provider in Settings.",
      status: 503,
    };
  }

  // ── Timeout ───────────────────────────────────────────────────────────────
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("deadline") || lower.includes("econnreset")) {
    return {
      message: "The AI took too long to respond.",
      action: "Try again — if this keeps happening, try a faster model or shorter content.",
      status: 504,
    };
  }

  // ── Network ───────────────────────────────────────────────────────────────
  if (lower.includes("network") || lower.includes("enotfound") || lower.includes("fetch failed") || lower.includes("connection refused")) {
    return {
      message: "Couldn't reach your AI provider.",
      action: "Check your internet connection and try again.",
      status: 502,
    };
  }

  // ── Content policy ────────────────────────────────────────────────────────
  if (lower.includes("content_policy") || lower.includes("content policy") || lower.includes("safety") || lower.includes("refused")) {
    return {
      message: "The AI couldn't process this content due to its safety guidelines.",
      action: "Try rephrasing your request or adjusting the topic.",
      status: 400,
    };
  }

  // ── Context length ────────────────────────────────────────────────────────
  if (lower.includes("context length") || lower.includes("too long") || lower.includes("max_tokens") || lower.includes("token limit")) {
    return {
      message: "Your content is too long for the AI to process.",
      action: "Try shortening your post or breaking it into smaller sections.",
      status: 400,
    };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return {
    message: "Something went wrong with the AI request.",
    action: "Try again. If this keeps happening, check your API key in Settings or try a different AI provider.",
    status: 500,
  };
}

/**
 * Log an API error with a consistent format, stripping potential secrets.
 */
export function logApiError(context: string, error: unknown): void {
  const message =
    error instanceof Error ? sanitizeString(error.message) : "Unknown error";
  const stack =
    error instanceof Error && error.stack
      ? sanitizeString(error.stack)
      : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      context,
      message,
      ...(stack ? { stack } : {}),
      timestamp: new Date().toISOString(),
    })
  );
}
