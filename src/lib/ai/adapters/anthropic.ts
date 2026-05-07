/**
 * Anthropic adapter.
 *
 * Validation: GET https://api.anthropic.com/v1/models with the user's key.
 * Models endpoint is the cheapest way to verify auth without burning tokens.
 *
 * Model fetch filters to current Claude families (haiku / sonnet / opus)
 * that the rest of the app knows how to call, dropping older snapshots
 * when a newer dated revision exists for the same family/version pair.
 */

import { withRetry } from "./retry";
import type { ModelEntry, ProviderAdapter, ValidationResult } from "./types";

interface AnthropicModelRow {
  id: string;
  display_name?: string;
  created_at?: string;
}

const ANTHROPIC_API = "https://api.anthropic.com/v1/models";
const ANTHROPIC_VERSION = "2023-06-01";

/** Curated fallback. Used when fetchModels fails repeatedly. */
const STATIC_TEXT: ModelEntry[] = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
];

/** Keep models whose id starts with one of these prefixes. */
const TEXT_FAMILY_PREFIXES = ["claude-opus-", "claude-sonnet-", "claude-haiku-"];

/** Light label cleanup: prefer the API's `display_name`, fall back to id. */
function toLabel(row: AnthropicModelRow): string {
  return row.display_name?.trim() || row.id;
}

async function callModelsEndpoint(apiKey: string): Promise<AnthropicModelRow[]> {
  const res = await fetch(ANTHROPIC_API, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
  });
  if (res.status === 401 || res.status === 403) {
    const err = new Error(`Anthropic auth failed (${res.status})`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Anthropic models endpoint failed: ${res.status}`);
  }
  const json = (await res.json()) as { data?: AnthropicModelRow[] };
  return json.data ?? [];
}

/** Only retry transient errors (network / 5xx / rate limit). */
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === undefined) return true; // network-level / no status: treat as transient
  return status >= 500 || status === 429;
}

export const anthropicAdapter: ProviderAdapter = {
  slug: "anthropic",

  async validateKey(apiKey: string): Promise<ValidationResult> {
    try {
      await callModelsEndpoint(apiKey);
      return { ok: true };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        return { ok: false, error: "Invalid Anthropic API key." };
      }
      const message = err instanceof Error ? err.message : "Validation failed";
      return { ok: false, error: message };
    }
  },

  async fetchModels(apiKey, kind) {
    if (kind !== "text") return []; // Anthropic does not produce images
    const rows = await withRetry(() => callModelsEndpoint(apiKey), {
      attempts: 3,
      shouldRetry: isTransient,
    });
    return rows
      .filter((r) => TEXT_FAMILY_PREFIXES.some((p) => r.id.startsWith(p)))
      .map((r) => ({ value: r.id, label: toLabel(r) }));
  },

  staticModels(kind) {
    if (kind !== "text") return [];
    return STATIC_TEXT;
  },
};
