/**
 * Client-side handler for 402 quota-exceeded responses emitted by
 * `buildQuotaExceededResponse()` in src/lib/quota.ts.
 *
 * Dispatches a global `postpilot:quota-exceeded` CustomEvent that
 * `<QuotaReachedModal>` (mounted in app/layout.tsx) listens for and renders
 * a tier-aware upgrade modal.
 *
 * Usage at a fetch call site:
 *
 *   const res = await fetch("/api/ai/brainstorm", { ... });
 *   if (await maybeHandleQuotaExceeded(res)) return;
 */

import { toast } from "sonner";

export const QUOTA_EXCEEDED_EVENT = "postpilot:quota-exceeded";

export interface QuotaExceededBody {
  error: string;
  reason: "quota_exceeded";
  quotaType: string;
  used: number;
  limit: number;
  tier: string;
  upgradePath: "byok" | "higher_tier";
}

/** Read the 402 body defensively — tolerate older routes that haven't been
 *  migrated to the structured response yet. */
async function readBody(res: Response): Promise<Partial<QuotaExceededBody> | null> {
  try {
    return (await res.json()) as Partial<QuotaExceededBody>;
  } catch {
    return null;
  }
}

export async function handleQuotaExceededResponse(res: Response): Promise<void> {
  const body = await readBody(res);

  // Fall back to a generic toast if the route hasn't adopted the structured
  // body yet — without quotaType/used/limit/tier the modal has nothing useful
  // to render.
  if (!body || body.reason !== "quota_exceeded") {
    toast.error(
      body?.error ??
        "You've hit a usage limit. Upgrade your plan or try again next month."
    );
    return;
  }

  if (typeof window === "undefined") return;

  // Dispatch the global event. <QuotaReachedModal> (mounted in app/layout.tsx)
  // picks it up and opens the modal.
  window.dispatchEvent(
    new CustomEvent(QUOTA_EXCEEDED_EVENT, { detail: body as QuotaExceededBody })
  );
}

/**
 * Convenience wrapper: intercept a Response, call the handler if it's 402,
 * return `true` if handled (caller should short-circuit) or `false`
 * otherwise.
 *
 *   if (await maybeHandleQuotaExceeded(res)) return;
 */
export async function maybeHandleQuotaExceeded(res: Response): Promise<boolean> {
  if (res.status === 402) {
    await handleQuotaExceededResponse(res);
    return true;
  }
  return false;
}
