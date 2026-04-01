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

// ─── Zod schemas for AI response validation ──────────────────────────────────

export const BrainstormResponseSchema = z.array(
  z.object({
    title: z.string(),
    description: z.string().optional(),
    hook: z.string().optional(),
  })
);

export const HashtagsResponseSchema = z.array(z.string());

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
