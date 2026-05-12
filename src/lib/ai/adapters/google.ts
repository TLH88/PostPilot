/**
 * Google Gemini adapter.
 *
 * Validation: GET https://generativelanguage.googleapis.com/v1beta/models?key=KEY
 * The endpoint returns a list of models with `supportedGenerationMethods`,
 * which we use both for filtering and as the most authoritative source of
 * truth for what each model can do.
 *
 *  - text  → models supporting `generateContent`
 *  - image → models supporting `generateImage` (or whose name implies image)
 *
 * The id we send back for `value` is the bare model id (e.g. "gemini-2.5-flash"),
 * stripped of the "models/" prefix that Google's API echoes back.
 */

import { withRetry } from "./retry";
import type { ModelEntry, ProviderAdapter, ValidationResult } from "./types";

interface GoogleModelRow {
  name: string; // "models/gemini-2.5-flash"
  baseModelId?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

const GOOGLE_API = "https://generativelanguage.googleapis.com/v1beta/models";

const STATIC_TEXT: ModelEntry[] = [
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

// 2026-05-12 — expanded to cover the Google image-capable models exposed by
// the Vercel AI Gateway. Gemini families (responseModalities: IMAGE) are
// listed first; Imagen 4 family follows for users who want pure image-gen
// (no text co-generation). Default stays on gemini-3.1-flash-image-preview
// since it's what the existing route falls back to.
const STATIC_IMAGE: ModelEntry[] = [
  { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image (Preview)" },
  { value: "gemini-3-pro-image", label: "Gemini 3 Pro Image" },
  { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
  { value: "imagen-4.0-ultra-generate-001", label: "Imagen 4 Ultra" },
  { value: "imagen-4.0-generate-001", label: "Imagen 4" },
  { value: "imagen-4.0-fast-generate-001", label: "Imagen 4 Fast" },
];

function stripPrefix(name: string): string {
  return name.replace(/^models\//, "");
}

function toLabel(row: GoogleModelRow): string {
  if (row.displayName?.trim()) return row.displayName.trim();
  return stripPrefix(row.name);
}

async function callModelsEndpoint(apiKey: string): Promise<GoogleModelRow[]> {
  const res = await fetch(`${GOOGLE_API}?key=${encodeURIComponent(apiKey)}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const err = new Error(`Google auth failed (${res.status})`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Google models endpoint failed: ${res.status}`);
  }
  const json = (await res.json()) as { models?: GoogleModelRow[] };
  return json.models ?? [];
}

function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === undefined) return true;
  return status >= 500 || status === 429;
}

const TEXT_FAMILY_PREFIXES = ["gemini-"];
const IMAGE_HINTS = [/-image/i, /imagen/i];

function filterFor(kind: "text" | "image", rows: GoogleModelRow[]): ModelEntry[] {
  const seen = new Set<string>();
  const out: ModelEntry[] = [];

  for (const r of rows) {
    const id = stripPrefix(r.name);
    const methods = r.supportedGenerationMethods ?? [];

    if (kind === "text") {
      // Must support generateContent and be in a known text family.
      if (!methods.includes("generateContent")) continue;
      if (!TEXT_FAMILY_PREFIXES.some((p) => id.startsWith(p))) continue;
      // Drop image-specialized variants from the text list.
      if (IMAGE_HINTS.some((rx) => rx.test(id))) continue;
    } else {
      // image
      const hintsImage =
        IMAGE_HINTS.some((rx) => rx.test(id)) ||
        methods.some((m) => /image/i.test(m));
      if (!hintsImage) continue;
    }

    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ value: id, label: toLabel(r) });
  }
  out.sort((a, b) => a.value.localeCompare(b.value));
  return out;
}

export const googleAdapter: ProviderAdapter = {
  slug: "google",

  async validateKey(apiKey: string): Promise<ValidationResult> {
    try {
      await callModelsEndpoint(apiKey);
      return { ok: true };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 400 || status === 401 || status === 403) {
        return { ok: false, error: "Invalid Google API key." };
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
