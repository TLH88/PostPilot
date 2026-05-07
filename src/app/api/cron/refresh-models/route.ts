import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";
import { getAdapter } from "@/lib/ai/adapters/registry";
import { refreshProviderModels } from "@/lib/ai/adapters/refresh-models";

/**
 * Daily refresh of `ai_models` for every active provider.
 *
 * Uses each provider's system key (env: SYSTEM_AI_KEY_<UPPER_SLUG>) so
 * the model catalog stays current even when no end-user has tested or
 * saved a key for that provider recently.
 *
 * Triggered by Vercel Cron (CRON_SECRET-protected) — see vercel.json.
 *
 * On-demand refreshes fired by Test/Save in the settings UI continue to
 * run; this cron is the safety net.
 *
 * Behavior on per-provider failure (transient network / 5xx): the
 * adapter's withRetry already takes 3 attempts, then the helper returns
 * { ok: false } and we KEEP the existing rows untouched (per owner
 * direction 2026-05-07 — never blow away the catalog on refresh failure).
 *
 * Returns a per-provider summary so the cron history is auditable.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: providers, error } = await supabase
      .from("ai_providers")
      .select("slug, capabilities, is_active")
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw error;

    const summary: Record<string, Record<string, { ok: boolean; count: number; source: string; error?: string }>> = {};

    for (const provider of providers ?? []) {
      const envKey = `SYSTEM_AI_KEY_${provider.slug.toUpperCase()}`;
      const apiKey = process.env[envKey];
      if (!apiKey) {
        summary[provider.slug] = {
          _: { ok: false, count: 0, source: "skipped", error: `Missing ${envKey}` },
        };
        continue;
      }

      const adapter = getAdapter(provider.slug);
      if (!adapter) {
        summary[provider.slug] = {
          _: { ok: false, count: 0, source: "skipped", error: "No adapter registered" },
        };
        continue;
      }

      summary[provider.slug] = {};
      const caps = (provider.capabilities as string[]) ?? [];
      for (const cap of caps) {
        if (cap !== "text" && cap !== "image") continue;
        const result = await refreshProviderModels(supabase, provider.slug, apiKey, cap);
        summary[provider.slug][cap] = {
          ok: result.ok,
          count: result.count,
          source: result.source,
          error: result.error,
        };
      }
    }

    return NextResponse.json({ refreshed: summary });
  } catch (err) {
    logApiError("api/cron/refresh-models", err);
    return NextResponse.json(
      { error: "Refresh failed" },
      { status: 500 }
    );
  }
}
