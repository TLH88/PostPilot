/**
 * Server-side rate table for estimating AI request cost when exact billing
 * data isn't available (BYOK direct calls that don't go through the gateway).
 *
 * Rates are per-million tokens, sourced from each provider's public pricing page.
 * The `cost_source` column in ai_usage_events will read 'estimated' for rows
 * that used this table, so we can always distinguish from gateway-exact values.
 *
 * IMPORTANT: Review and update this table quarterly. Provider pricing changes
 * will cause drift. The Vercel AI Gateway /v1/models endpoint could be used
 * as a source of truth for gateway requests in a future improvement.
 *
 * Pricing sources (as of 2026-04-12):
 * - Anthropic: https://www.anthropic.com/pricing
 * - OpenAI: https://openai.com/api/pricing
 * - Google: https://ai.google.dev/pricing
 * - Perplexity: https://docs.perplexity.ai/guides/pricing
 */

interface TokenRate {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedReadPerMillion?: number;
}

interface ImageRate {
  perImage: number;
}

type ModelRate = TokenRate | ImageRate;

function isImageRate(r: ModelRate): r is ImageRate {
  return "perImage" in r;
}

// Rates in USD per million tokens (or per image for image models)
const RATE_TABLE: Record<string, ModelRate> = {
  // ── Anthropic ────────────────────────────────────────────────────────
  "anthropic/claude-opus-4-6":             { inputPerMillion: 15, outputPerMillion: 75, cachedReadPerMillion: 1.5 },
  "anthropic/claude-sonnet-4-6":           { inputPerMillion: 3, outputPerMillion: 15, cachedReadPerMillion: 0.3 },
  "anthropic/claude-haiku-4-5-20251001":   { inputPerMillion: 0.80, outputPerMillion: 4, cachedReadPerMillion: 0.08 },
  "anthropic/claude-opus-4-5-20251101":    { inputPerMillion: 15, outputPerMillion: 75, cachedReadPerMillion: 1.5 },
  "anthropic/claude-sonnet-4-5-20250929":  { inputPerMillion: 3, outputPerMillion: 15, cachedReadPerMillion: 0.3 },
  "anthropic/claude-opus-4-1-20250805":    { inputPerMillion: 15, outputPerMillion: 75, cachedReadPerMillion: 1.5 },
  "anthropic/claude-sonnet-4-20250514":    { inputPerMillion: 3, outputPerMillion: 15, cachedReadPerMillion: 0.3 },
  "anthropic/claude-opus-4-20250514":      { inputPerMillion: 15, outputPerMillion: 75, cachedReadPerMillion: 1.5 },

  // ── OpenAI ───────────────────────────────────────────────────────────
  "openai/o3":                 { inputPerMillion: 10, outputPerMillion: 40 },
  "openai/o4-mini":            { inputPerMillion: 1.10, outputPerMillion: 4.40 },
  "openai/o3-mini":            { inputPerMillion: 1.10, outputPerMillion: 4.40 },
  "openai/gpt-4.1":            { inputPerMillion: 2, outputPerMillion: 8 },
  "openai/gpt-4.1-mini":       { inputPerMillion: 0.40, outputPerMillion: 1.60 },
  "openai/gpt-4.1-nano":       { inputPerMillion: 0.10, outputPerMillion: 0.40 },
  "openai/gpt-4o":             { inputPerMillion: 2.50, outputPerMillion: 10 },
  "openai/gpt-4o-mini":        { inputPerMillion: 0.15, outputPerMillion: 0.60 },

  // ── Google ───────────────────────────────────────────────────────────
  "google/gemini-2.5-pro":          { inputPerMillion: 1.25, outputPerMillion: 10, cachedReadPerMillion: 0.3125 },
  "google/gemini-2.5-flash":        { inputPerMillion: 0.15, outputPerMillion: 0.60, cachedReadPerMillion: 0.0375 },
  "google/gemini-2.5-flash-lite":   { inputPerMillion: 0.075, outputPerMillion: 0.30 },
  "google/gemini-2.0-flash":        { inputPerMillion: 0.10, outputPerMillion: 0.40, cachedReadPerMillion: 0.025 },

  // ── Perplexity ───────────────────────────────────────────────────────
  "perplexity/sonar-deep-research":  { inputPerMillion: 2, outputPerMillion: 8 },
  "perplexity/sonar-reasoning-pro":  { inputPerMillion: 2, outputPerMillion: 8 },
  "perplexity/sonar-reasoning":      { inputPerMillion: 1, outputPerMillion: 5 },
  "perplexity/sonar-pro":            { inputPerMillion: 3, outputPerMillion: 15 },
  "perplexity/sonar":                { inputPerMillion: 1, outputPerMillion: 1 },

  // ── Image models ─────────────────────────────────────────────────────
  "openai/gpt-image-1":   { perImage: 0.04 },  // ~1024px, standard quality
  "openai/dall-e-3":       { perImage: 0.04 },
  "openai/dall-e-2":       { perImage: 0.02 },
  "google/gemini-3.1-flash-image-preview": { perImage: 0.0395 },
};

// Default fallback when a model isn't in the table
const DEFAULT_TOKEN_RATE: TokenRate = {
  inputPerMillion: 2,
  outputPerMillion: 10,
};

const DEFAULT_IMAGE_RATE: ImageRate = {
  perImage: 0.05,
};

/**
 * Estimate cost in USD for a text AI request using the rate table.
 * Returns `undefined` if tokens data is missing.
 */
export function estimateTokenCostUsd(
  provider: string,
  model: string,
  tokens: {
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
  }
): number | undefined {
  const { inputTokens, outputTokens, cachedTokens } = tokens;
  if (inputTokens == null && outputTokens == null) return undefined;

  const key = `${provider}/${model}`;
  const rate = RATE_TABLE[key];
  const tokenRate = rate && !isImageRate(rate) ? rate : DEFAULT_TOKEN_RATE;

  let cost = 0;

  // Standard input tokens (subtract cached if we have both)
  const standardInput = (inputTokens ?? 0) - (cachedTokens ?? 0);
  cost += (Math.max(0, standardInput) / 1_000_000) * tokenRate.inputPerMillion;

  // Cached input tokens at reduced rate
  if (cachedTokens && tokenRate.cachedReadPerMillion) {
    cost += (cachedTokens / 1_000_000) * tokenRate.cachedReadPerMillion;
  } else if (cachedTokens) {
    // Fallback: cached tokens at full input rate (conservative overestimate)
    cost += (cachedTokens / 1_000_000) * tokenRate.inputPerMillion;
  }

  // Output tokens
  cost += ((outputTokens ?? 0) / 1_000_000) * tokenRate.outputPerMillion;

  return cost;
}

/**
 * Estimate cost in USD for an image generation request.
 */
export function estimateImageCostUsd(
  provider: string,
  model: string,
  imageCount: number = 1
): number {
  const key = `${provider}/${model}`;
  const rate = RATE_TABLE[key];
  const imageRate = rate && isImageRate(rate) ? rate : DEFAULT_IMAGE_RATE;
  return imageRate.perImage * imageCount;
}

/**
 * Compute how much was saved by prompt caching compared to full-price input.
 * Returns 0 if no cached tokens or no cached rate available.
 */
export function estimateCachedSavingsUsd(
  provider: string,
  model: string,
  cachedTokens?: number
): number {
  if (!cachedTokens || cachedTokens <= 0) return 0;

  const key = `${provider}/${model}`;
  const rate = RATE_TABLE[key];
  const tokenRate = rate && !isImageRate(rate) ? rate : DEFAULT_TOKEN_RATE;

  if (!tokenRate.cachedReadPerMillion) return 0;

  const fullPrice = (cachedTokens / 1_000_000) * tokenRate.inputPerMillion;
  const cachedPrice = (cachedTokens / 1_000_000) * tokenRate.cachedReadPerMillion;
  return fullPrice - cachedPrice;
}
