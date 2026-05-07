/**
 * Shared refresh path: pulls a provider's current model list via its
 * adapter and upserts into `ai_models`.
 *
 * Owner direction 2026-05-07:
 *   - Up to 3 retries on transient errors (the adapter's fetchModels
 *     uses `withRetry` internally).
 *   - On terminal failure, KEEP existing rows in ai_models — never
 *     blow them away. Caller surfaces a non-blocking warning.
 *   - When the adapter returns null (provider has no models endpoint
 *     — Perplexity), fall back to the adapter's `staticModels` list
 *     and upsert that instead. This keeps Perplexity's curated list
 *     visible in /api/models alongside live providers.
 *
 * `kind` is `'text' | 'image'` — separate refreshes per kind because
 * one provider (OpenAI, Google) supports both and a key for one type
 * may not have entitlements for the other.
 *
 * Returns a structured result so the caller (route handler / cron)
 * can decide whether to surface success / soft-warning / hard-fail.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdapter } from "./registry";
import type { ModelEntry } from "./types";

export interface RefreshResult {
  /** Did at least one source (live or static) produce models? */
  ok: boolean;
  /** How the list was obtained. */
  source: "live" | "static" | "skipped";
  /** Number of model rows upserted. */
  count: number;
  /** Surface-able error string when ok=false (all retries failed). */
  error?: string;
}

const NULL_RESULT_OK: RefreshResult = {
  ok: true,
  source: "skipped",
  count: 0,
};

export async function refreshProviderModels(
  supabase: SupabaseClient,
  providerSlug: string,
  apiKey: string,
  kind: "text" | "image"
): Promise<RefreshResult> {
  const adapter = getAdapter(providerSlug);
  if (!adapter) {
    return { ok: false, source: "skipped", count: 0, error: "Unknown provider" };
  }

  let entries: ModelEntry[];
  let source: "live" | "static" = "live";

  try {
    const live = await adapter.fetchModels(apiKey, kind);
    if (live === null) {
      // Provider has no models endpoint (e.g. Perplexity) — use static.
      entries = adapter.staticModels(kind);
      source = "static";
    } else if (live.length === 0) {
      // Endpoint succeeded but returned nothing for this kind. Don't
      // stomp the existing list with an empty refresh; treat as a
      // benign skip.
      return NULL_RESULT_OK;
    } else {
      entries = live;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown refresh error";
    return { ok: false, source: "skipped", count: 0, error: message };
  }

  if (entries.length === 0) {
    return NULL_RESULT_OK;
  }

  // Upsert each entry. We also flip is_active on previously-known rows
  // for this (provider, kind) that are no longer in the fetched list,
  // so deprecated models drop out of the UI without losing history.
  const fetchedIds = new Set(entries.map((e) => e.value));

  // Batch upsert: relies on a unique (provider, model_id, kind) pair.
  // The current ai_models table predates the kind column, so we add
  // it to the on-conflict tuple via a partial-key strategy: upsert by
  // (provider, model_id) and set kind on insert+update.
  const rows = entries.map((e, i) => ({
    provider: providerSlug,
    model_id: e.value,
    label: e.label,
    kind,
    is_active: true,
    sort_order: i,
    last_fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertErr } = await supabase
    .from("ai_models")
    .upsert(rows, { onConflict: "provider,model_id" });

  if (upsertErr) {
    return {
      ok: false,
      source,
      count: 0,
      error: upsertErr.message,
    };
  }

  // Mark stale rows inactive (not in the fresh list) for this kind.
  const { data: existing } = await supabase
    .from("ai_models")
    .select("model_id")
    .eq("provider", providerSlug)
    .eq("kind", kind);

  const stale = (existing ?? [])
    .map((r) => r.model_id as string)
    .filter((id) => !fetchedIds.has(id));

  if (stale.length > 0) {
    await supabase
      .from("ai_models")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("provider", providerSlug)
      .eq("kind", kind)
      .in("model_id", stale);
  }

  return { ok: true, source, count: entries.length };
}
