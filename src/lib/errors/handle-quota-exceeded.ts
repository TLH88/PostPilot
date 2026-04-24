/**
 * BP-117 Phase C — client-side handler for 402 quota-exceeded responses
 * emitted by `buildQuotaExceededResponse()` in src/lib/quota.ts.
 *
 * Reads the structured body and drives a tier-aware toast with the right
 * upgrade CTA:
 *   upgradePath = "byok"         → suggest configuring a personal API key
 *   upgradePath = "higher_tier"  → suggest upgrading to a higher plan
 *
 * Usage at a fetch call site:
 *
 *   const res = await fetch("/api/ai/brainstorm", { ... });
 *   if (res.status === 402) {
 *     await handleQuotaExceededResponse(res);
 *     return;
 *   }
 *   if (!res.ok) { ... }
 *
 * Never throws; always consumes the body and surfaces a toast.
 */

import { toast } from "sonner";

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

  const featureLabel = labelForQuotaType(body.quotaType);
  const headline = `You've used all your ${featureLabel} this month (${body.used}/${body.limit}).`;

  if (body.upgradePath === "byok") {
    toast.error(headline, {
      description:
        "Add your own AI provider key in Settings → AI Model for unlimited usage.",
      action: {
        label: "Add key",
        onClick: () => {
          if (typeof window !== "undefined") window.location.href = "/settings";
        },
      },
      duration: 8000,
    });
    return;
  }

  // higher_tier — Free / Personal / Team
  toast.error(headline, {
    description: "Upgrade your plan to keep creating.",
    action: {
      label: "View plans",
      onClick: () => {
        if (typeof window !== "undefined") window.location.href = "/pricing";
      },
    },
    duration: 8000,
  });
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
