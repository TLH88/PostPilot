/**
 * Provider adapter registry.
 *
 * Adding a new provider:
 *   1. Implement the ProviderAdapter interface in `./<slug>.ts`.
 *   2. Import + register here.
 *   3. Insert a row in the `ai_providers` table (slug, label, ...).
 *
 * Settings UI, validation, and model refresh pick up the new provider
 * with no further code edits in components or routes.
 */

import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";
import { googleAdapter } from "./google";
import { perplexityAdapter } from "./perplexity";
import type { ProviderAdapter } from "./types";

const ADAPTERS: Record<string, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  google: googleAdapter,
  perplexity: perplexityAdapter,
};

export function getAdapter(slug: string): ProviderAdapter | null {
  return ADAPTERS[slug] ?? null;
}

export function getAllAdapters(): ProviderAdapter[] {
  return Object.values(ADAPTERS);
}
