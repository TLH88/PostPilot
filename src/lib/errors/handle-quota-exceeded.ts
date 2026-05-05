/**
 * Client-side handler for 402 quota-exceeded responses emitted by
 * `buildQuotaExceededResponse()` in src/lib/quota.ts.
 *
 * Dispatches a global `postpilot:quota-exceeded` CustomEvent that
 * `<QuotaReachedModal>` (mounted in app/layout.tsx) listens for and renders
 * a tier-aware upgrade modal. Falls back to a toast if no modal is mounted
 * (defensive — e.g. an admin route that doesn't include the provider).
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

function labelForQuotaType(quotaType: string | undefined): string {
  switch (quotaType) {
    case "posts": return "posts";
    case "brainstorms": return "brainstorms";
    case "chat_messages": return "AI chats";
    case "scheduled_posts": return "scheduled posts";
    case "image_generations": return "image generations";
    default: return "AI requests";
  }
}

/** Fallback toast for environments where the modal provider isn't mounted. */
function toastFallback(body: QuotaExceededBody) {
  const featureLabel = labelForQuotaType(body.quotaType);
  const headline = `You've used all your ${featureLabel} this month (${body.used}/${body.limit}).`;
  toast.error(headline, {
    description:
      body.upgradePath === "byok"
        ? "Add your own AI provider key in Settings → AI Model for unlimited usage."
        : "Upgrade your plan to keep creating.",
    action: {
      label: body.upgradePath === "byok" ? "Add key" : "View plans",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.location.href =
            body.upgradePath === "byok" ? "/settings" : "/pricing";
        }
      },
    },
    duration: 8000,
  });
}

export async function handleQuotaExceededResponse(res: Response): Promise<void> {
  const body = await readBody(res);

  // Fall back to a generic message if the route hasn't adopted the
  // structured body yet.
  if (!body || body.reason !== "quota_exceeded") {
    toast.error(
      body?.error ??
        "You've hit a usage limit. Upgrade your plan or try again next month."
    );
    return;
  }

  if (typeof window === "undefined") return;

  // Dispatch the modal event. If nothing's listening (rare — modal is mounted
  // in app/layout.tsx), fall back to the legacy toast so the user still gets
  // a signal. We detect "nothing listening" via a one-shot boolean flipped by
  // the modal's listener through a synchronous follow-up event.
  const detail = body as QuotaExceededBody;
  let handled = false;
  const ackHandler = () => {
    handled = true;
  };
  window.addEventListener("postpilot:quota-exceeded:ack", ackHandler, {
    once: true,
  });
  window.dispatchEvent(
    new CustomEvent(QUOTA_EXCEEDED_EVENT, { detail })
  );
  // Listener acks synchronously inside the dispatch tick, so by here we know.
  window.removeEventListener("postpilot:quota-exceeded:ack", ackHandler);
  if (!handled) toastFallback(detail);
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
