/**
 * Map an arbitrary error into a user-friendly message without leaking
 * implementation details (RLS policy names, table names, stack traces).
 *
 * Always logs the raw error to the console so debuggability is preserved.
 * The returned string is safe to drop into a toast or inline banner.
 *
 * Usage:
 *   toast.error(toUserMessage(error, "Couldn't save your changes."));
 */

type MaybeErrorObject = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  name?: unknown;
};

function asObject(e: unknown): MaybeErrorObject {
  return (typeof e === "object" && e !== null) ? (e as MaybeErrorObject) : {};
}

function hasTerm(msg: string, ...terms: string[]): boolean {
  const lower = msg.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

export function toUserMessage(error: unknown, fallback: string): string {
  // Always preserve developer context
  // eslint-disable-next-line no-console
  console.error("[toUserMessage]", error);

  if (!error) return fallback;

  const obj = asObject(error);
  const code = typeof obj.code === "string" ? obj.code : "";
  const status = typeof obj.status === "number" ? obj.status : undefined;
  const rawMessage =
    typeof obj.message === "string"
      ? obj.message
      : typeof error === "string"
        ? error
        : "";

  // Network / offline
  if (
    (obj.name === "TypeError" && hasTerm(rawMessage, "fetch")) ||
    hasTerm(rawMessage, "network", "failed to fetch", "network request failed")
  ) {
    return "Network error. Check your connection and try again.";
  }

  // Auth — 401 / Unauthorized
  if (status === 401 || hasTerm(rawMessage, "unauthorized", "jwt expired", "not authenticated")) {
    return "Your session expired. Please sign in again.";
  }

  // Permission / RLS — don't leak the table or policy name
  if (
    status === 403 ||
    code === "PGRST301" ||
    code === "42501" ||
    hasTerm(rawMessage, "row-level security", "row level security", "permission denied", "rls")
  ) {
    return "You don't have permission to do that.";
  }

  // Not found
  if (status === 404 || code === "PGRST116") {
    return "We couldn't find that item. It may have been deleted.";
  }

  // Uniqueness / duplicate
  if (code === "23505" || hasTerm(rawMessage, "duplicate key", "already exists", "unique constraint")) {
    return "That item already exists.";
  }

  // FK / invalid reference
  if (code === "23503") {
    return "That action references something that no longer exists.";
  }

  // Rate limit / quota
  if (
    status === 429 ||
    hasTerm(rawMessage, "rate limit", "too many requests", "quota exceeded", "insufficient_quota")
  ) {
    return "You've hit a usage limit. Please wait a moment and try again.";
  }

  // AI provider / credits
  if (hasTerm(rawMessage, "api key", "no api key", "invalid api key", "incorrect api key")) {
    return "Your AI provider key isn't working. Check it in Settings.";
  }
  if (hasTerm(rawMessage, "credits", "payment required", "billing")) {
    return "Your AI provider is reporting a billing issue. Check your provider account.";
  }

  // Server error
  if (status && status >= 500) {
    return "Something went wrong on our end. Please try again in a moment.";
  }

  return fallback;
}
