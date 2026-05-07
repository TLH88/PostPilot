/**
 * Perplexity adapter.
 *
 * Perplexity does not expose a public models endpoint as of 2026-05.
 * Validation hits the chat completions endpoint with a 1-token request to
 * verify the key is alive; fetchModels returns null so the registry falls
 * back to the curated static list below.
 *
 * Text-only: Perplexity has no image-generation product.
 */

import type { ModelEntry, ProviderAdapter, ValidationResult } from "./types";

const PPLX_CHAT_API = "https://api.perplexity.ai/chat/completions";

const STATIC_TEXT: ModelEntry[] = [
  { value: "sonar-pro", label: "Sonar Pro" },
  { value: "sonar", label: "Sonar" },
  { value: "sonar-reasoning-pro", label: "Sonar Reasoning Pro" },
  { value: "sonar-reasoning", label: "Sonar Reasoning" },
  { value: "sonar-deep-research", label: "Sonar Deep Research" },
];

export const perplexityAdapter: ProviderAdapter = {
  slug: "perplexity",

  async validateKey(apiKey: string): Promise<ValidationResult> {
    try {
      const res = await fetch(PPLX_CHAT_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: "ok" }],
          max_tokens: 1,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: "Invalid Perplexity API key." };
      }
      if (!res.ok) {
        return { ok: false, error: `Perplexity returned ${res.status}.` };
      }
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed";
      return { ok: false, error: message };
    }
  },

  async fetchModels(_apiKey, kind) {
    if (kind !== "text") return [];
    // Perplexity has no public models endpoint; force fallback to static.
    return null;
  },

  staticModels(kind) {
    return kind === "text" ? STATIC_TEXT : [];
  },
};
