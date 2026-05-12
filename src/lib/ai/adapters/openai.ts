/**
 * OpenAI adapter.
 *
 * Validation: GET https://api.openai.com/v1/models — cheap, doesn't burn
 * inference tokens.
 *
 * Filter strategy: OpenAI's models endpoint returns a kitchen sink
 * (embeddings, transcription, fine-tunes, deprecated, internal tooling).
 * We filter aggressively to the families the app supports:
 *   text:  gpt-4*, gpt-5*, o1*, o3*, o4*, chatgpt-* (anything "chat-capable")
 *   image: dall-e-*, gpt-image-*
 *
 * The model `id` we send to the API is the same id OpenAI returns; for
 * UX labels we apply a small humanizer (gpt-4.1 → "GPT-4.1") because the
 * raw ids include date suffixes that read poorly in dropdowns.
 */

import { withRetry } from "./retry";
import type { ModelEntry, ProviderAdapter, ValidationResult } from "./types";

interface OpenAIModelRow {
  id: string;
  object?: string;
  owned_by?: string;
  created?: number;
}

const OPENAI_API = "https://api.openai.com/v1/models";

const STATIC_TEXT: ModelEntry[] = [
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "o3", label: "o3 (Reasoning)" },
  { value: "o4-mini", label: "o4-mini (Reasoning)" },
  { value: "o3-mini", label: "o3-mini (Reasoning)" },
];

// 2026-05-12 — expanded to cover the OpenAI image-capable models that the
// Vercel AI Gateway exposes. GPT Image 1 stays first so it's the picker's
// default (matches the route's `imageModel || "gpt-image-1"` fallback).
// DALL-E variants kept at the tail for users with BYOK keys who still rely
// on the legacy Images API; they pass through unchanged on the direct path.
const STATIC_IMAGE: ModelEntry[] = [
  { value: "gpt-image-1", label: "GPT Image 1 (recommended)" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-5-pro", label: "GPT-5 Pro (multimodal)" },
  { value: "gpt-5-nano", label: "GPT-5 Nano (multimodal)" },
  { value: "dall-e-3", label: "DALL-E 3" },
  { value: "dall-e-2", label: "DALL-E 2" },
];

const TEXT_INCLUDE_PATTERNS: RegExp[] = [
  /^gpt-4(\.|-)/, // gpt-4.1, gpt-4o, gpt-4-turbo, ...
  /^gpt-5(\.|-)/, // future-proofing
  /^o[134](-|$)/, // o1, o3, o3-mini, o4-mini
  /^chatgpt-/, // chatgpt-4o-latest etc.
];
const TEXT_EXCLUDE_PATTERNS: RegExp[] = [
  /-instruct\b/,
  /-realtime/,
  /-audio/,
  /-search/,
  /-transcribe/,
  /\bft:/, // fine-tuned models
  /-vision-preview/,
];

const IMAGE_INCLUDE_PATTERNS: RegExp[] = [/^dall-e-/, /^gpt-image-/];

function humanize(id: string): string {
  // Strip date suffixes ("-2025-08-15") that OpenAI bakes into ids.
  const trimmed = id.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  // Light family-aware capitalization.
  if (/^gpt-/.test(trimmed)) {
    return trimmed.replace(/^gpt-/, "GPT-");
  }
  if (/^dall-e-/.test(trimmed)) {
    return trimmed.replace(/^dall-e-/, "DALL-E ");
  }
  if (/^o\d/.test(trimmed)) {
    // o3, o4-mini ⇒ leave lowercase, append "(Reasoning)" for the
    // reasoning families to match the curated labels.
    return /-mini\b/.test(trimmed) ? `${trimmed} (Reasoning)` : `${trimmed} (Reasoning)`;
  }
  return trimmed;
}

async function callModelsEndpoint(apiKey: string): Promise<OpenAIModelRow[]> {
  const res = await fetch(OPENAI_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
  });
  if (res.status === 401 || res.status === 403) {
    const err = new Error(`OpenAI auth failed (${res.status})`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`OpenAI models endpoint failed: ${res.status}`);
  }
  const json = (await res.json()) as { data?: OpenAIModelRow[] };
  return json.data ?? [];
}

function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === undefined) return true;
  return status >= 500 || status === 429;
}

function filterFor(kind: "text" | "image", rows: OpenAIModelRow[]): ModelEntry[] {
  const includes = kind === "text" ? TEXT_INCLUDE_PATTERNS : IMAGE_INCLUDE_PATTERNS;
  const excludes = kind === "text" ? TEXT_EXCLUDE_PATTERNS : [];
  const seen = new Set<string>();
  const out: ModelEntry[] = [];
  for (const r of rows) {
    if (!includes.some((p) => p.test(r.id))) continue;
    if (excludes.some((p) => p.test(r.id))) continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({ value: r.id, label: humanize(r.id) });
  }
  // Stable, human-friendly sort: newer GPT > older GPT > o-series.
  out.sort((a, b) => a.value.localeCompare(b.value));
  return out;
}

export const openaiAdapter: ProviderAdapter = {
  slug: "openai",

  async validateKey(apiKey: string): Promise<ValidationResult> {
    try {
      await callModelsEndpoint(apiKey);
      return { ok: true };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        return { ok: false, error: "Invalid OpenAI API key." };
      }
      const message = err instanceof Error ? err.message : "Validation failed";
      return { ok: false, error: message };
    }
  },

  async fetchModels(apiKey, kind) {
    const rows = await withRetry(() => callModelsEndpoint(apiKey), {
      attempts: 3,
      shouldRetry: isTransient,
    });
    return filterFor(kind, rows);
  },

  staticModels(kind) {
    return kind === "image" ? STATIC_IMAGE : STATIC_TEXT;
  },
};
