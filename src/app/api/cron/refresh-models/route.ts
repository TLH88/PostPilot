import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";
import { getAdapter } from "@/lib/ai/adapters/registry";
import { refreshProviderModels } from "@/lib/ai/adapters/refresh-models";
import { notifyAdmins } from "@/lib/admin/notify-admins";

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
 * Failure notification: any per-provider failure (or a hard failure of
 * the whole route) inserts a notification row for every admin in
 * ADMIN_EMAILS via `notifyAdmins`. Admins see it in their NotificationsBell
 * with a deep link to /admin so they can investigate. The cron itself
 * still returns 200 with a summary so Vercel doesn't auto-retry — the
 * alert path is the action signal, not the HTTP status.
 */

interface PerKindResult {
  ok: boolean;
  count: number;
  source: string;
  error?: string;
}

type ProviderSummary = Record<string, PerKindResult>;

function collectFailures(summary: Record<string, ProviderSummary>): string[] {
  const failures: string[] = [];
  for (const [slug, perKind] of Object.entries(summary)) {
    for (const [kind, result] of Object.entries(perKind)) {
      if (!result.ok) {
        failures.push(
          `${slug}/${kind === "_" ? "—" : kind}: ${result.error ?? "unknown error"}`
        );
      }
    }
  }
  return failures;
}

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

    const summary: Record<string, ProviderSummary> = {};

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

    // Surface partial failures to admins so they can investigate. We
    // notify on *any* failure (missing env var, no adapter, fetch error
    // after retries) — the catalog still has the previous rows so users
    // are not blocked, but the staleness will worsen until someone fixes
    // the underlying cause.
    const failures = collectFailures(summary);
    if (failures.length > 0) {
      try {
        await notifyAdmins({
          type: "cron_refresh_models_failure",
          title: `AI model refresh failed for ${failures.length} provider/kind${failures.length === 1 ? "" : "s"}`,
          body:
            failures.join(" · ") +
            " — existing model rows were preserved. Investigate via /admin or rerun the cron manually after fixing the cause.",
          actionUrl: "/admin",
        });
      } catch (notifyErr) {
        // The cron's primary job (refresh) already happened; if the
        // notification insert fails too, log it but don't 500 — admins
        // will still see the issue in cron logs and via Vercel UI.
        logApiError("api/cron/refresh-models:notify-admins", notifyErr);
      }
    }

    return NextResponse.json({ refreshed: summary, failures });
  } catch (err) {
    logApiError("api/cron/refresh-models", err);
    // Total failure of the route itself — also notify admins so the
    // problem doesn't go unnoticed (no per-provider results to summarize).
    try {
      await notifyAdmins({
        type: "cron_refresh_models_failure",
        title: "AI model refresh cron failed entirely",
        body:
          (err instanceof Error ? err.message : "Unknown error") +
          " — the daily catalog refresh did not run. Investigate via /admin or rerun the cron manually.",
        actionUrl: "/admin",
      });
    } catch (notifyErr) {
      logApiError("api/cron/refresh-models:notify-admins-total", notifyErr);
    }
    return NextResponse.json(
      { error: "Refresh failed" },
      { status: 500 }
    );
  }
}
