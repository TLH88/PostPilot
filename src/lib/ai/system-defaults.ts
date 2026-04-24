/**
 * BP-117 Phase D — admin-controlled system AI defaults.
 *
 * Reads the `system_ai_config` singleton that drives which provider and
 * model every system-key AI call uses. Admins can change these values
 * live from the admin dashboard; this helper reads fresh each call to a
 * route rather than caching process-wide, because changes should take
 * effect immediately without a restart.
 *
 * Routes should only reach for this when source !== "byok". BYOK users
 * run on their own provider/model.
 */

import { createClient } from "@/lib/supabase/server";
import type { AIProvider } from "./providers";

export interface SystemAIDefaults {
  provider: AIProvider;
  model: string;
}

/** Fallback if the config row is somehow missing (shouldn't happen — seeded
 *  on migration and admins can't delete the singleton). Matches the cost
 *  study's recommended default. */
const FALLBACK: SystemAIDefaults = {
  provider: "openai",
  model: "gpt-4.1-mini",
};

/**
 * Read the current system AI defaults. Call this inside the request
 * handler — no process-wide cache, so admin changes propagate instantly.
 */
export async function getSystemAIDefaults(): Promise<SystemAIDefaults> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("system_ai_config")
      .select("default_provider, default_model")
      .eq("id", 1)
      .single();

    if (data) {
      return {
        provider: data.default_provider as AIProvider,
        model: data.default_model,
      };
    }
  } catch {
    // Fall through to FALLBACK
  }
  return FALLBACK;
}
