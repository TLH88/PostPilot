/**
 * 2026-05-12 — Tier-gated image-model visibility.
 *
 * Free / Personal tiers see a curated subset of image models. Pro+ unlocks
 * the full catalog. Owner-locked spec (2026-05-12):
 *
 *   OpenAI basic:  GPT-5 Nano (default), GPT-5.1 Thinking, GPT-5,
 *                  DALL-E 3, DALL-E 2
 *   Google basic:  Gemini 3.1 Flash Image (Preview), Gemini 2.5 Flash
 *                  Image, Imagen 4 Ultra, Imagen 4 (default), Imagen 4 Fast
 *
 * The /api/models endpoint applies this filter server-side based on the
 * caller's tier. UI gating uses the same map for display affordances.
 */

import type { AIProvider } from "@/lib/ai/providers";

export const BASIC_IMAGE_MODELS: Record<AIProvider, string[]> = {
  openai: [
    "gpt-5-nano",
    "gpt-5.1-thinking",
    "gpt-5",
    "dall-e-3",
    "dall-e-2",
  ],
  google: [
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash-image",
    "imagen-4.0-ultra-generate-001",
    "imagen-4.0-generate-001",
    "imagen-4.0-fast-generate-001",
  ],
  // Anthropic and Perplexity don't ship image-capable models today; the
  // adapter staticModels() returns [] for them, so these entries stay empty.
  anthropic: [],
  perplexity: [],
};

/**
 * Per-tier default model overrides. When the user is gated to the basic set,
 * the recommended default may differ from the full-catalog default. Owner
 * spec 2026-05-12: Google's basic default is Imagen 4 (not Gemini 3.1
 * Flash Image Preview). OpenAI's default stays gpt-5-nano across tiers.
 */
export const BASIC_IMAGE_DEFAULTS: Partial<Record<AIProvider, string>> = {
  openai: "gpt-5-nano",
  google: "imagen-4.0-generate-001",
};
