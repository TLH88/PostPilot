/**
 * BP-117 Phase D / BP-174 — admin-controlled system AI defaults.
 *
 * Reads the `system_ai_defaults` matrix (tier × kind) that drives which
 * provider and model every system-key AI call uses. Admins can change
 * these values live from /admin/system; this helper reads fresh each
 * call so changes take effect immediately without a restart.
 *
 * Back-compat: the legacy singleton `system_ai_config` is consulted as a
 * fallback if `system_ai_defaults` has no matching row for the (tier,
 * kind) ask. Lets the migration cross over cleanly during deploy.
 *
 * Routes should only reach for this when source !== "byok". BYOK users
 * run on their own provider/model.
 */

import { createClient } from "@/lib/supabase/server";
import type { AIProvider } from "./providers";

export type AITier = "free_personal" | "pro_plus";
export type AIKind = "text" | "image";

export interface SystemAIDefaults {
  provider: AIProvider;
  model: string;
}

/** Map a subscription_tier value to the (tier) bucket used in defaults. */
export function bucketForTier(subscriptionTier: string | null | undefined): AITier {
  const t = (subscriptionTier ?? "free").toLowerCase();
  if (t === "professional" || t === "team" || t === "enterprise") return "pro_plus";
  return "free_personal";
}

/** Final fallback if neither DB table has a row — matches cost-study default. */
const FALLBACK_TEXT: SystemAIDefaults = { provider: "openai", model: "gpt-4.1-mini" };
const FALLBACK_IMAGE: SystemAIDefaults = { provider: "openai", model: "gpt-image-1-mini" };

interface GetOptions {
  tier?: AITier;
  kind?: AIKind;
}

/**
 * Read the current system AI default for a (tier, kind) pair.
 *
 * Resolution order:
 *   1. system_ai_defaults matching (tier, kind)
 *   2. system_ai_config singleton (text only — legacy)
 *   3. Hardcoded FALLBACK for the kind
 *
 * Call inside the request handler — no process-wide cache so admin
 * changes propagate instantly.
 */
export async function getSystemAIDefaults(
  opts: GetOptions = {},
): Promise<SystemAIDefaults> {
  const tier = opts.tier ?? "free_personal";
  const kind = opts.kind ?? "text";

  try {
    const supabase = await createClient();

    // 1. New tier × kind matrix
    const { data: tiered } = await supabase
      .from("system_ai_defaults")
      .select("provider, model")
      .eq("tier", tier)
      .eq("kind", kind)
      .maybeSingle();
    if (tiered) {
      return {
        provider: tiered.provider as AIProvider,
        model: tiered.model,
      };
    }

    // 2. Legacy singleton (text only)
    if (kind === "text") {
      const { data: legacy } = await supabase
        .from("system_ai_config")
        .select("default_provider, default_model")
        .eq("id", 1)
        .single();
      if (legacy) {
        return {
          provider: legacy.default_provider as AIProvider,
          model: legacy.default_model,
        };
      }
    }
  } catch {
    // Fall through to hardcoded fallback
  }

  return kind === "image" ? FALLBACK_IMAGE : FALLBACK_TEXT;
}
