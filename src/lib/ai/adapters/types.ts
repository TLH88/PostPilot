/**
 * Provider adapter contract.
 *
 * Adding a new AI provider to PostPilot is intentionally three steps:
 *
 *   1. Insert a row into the `ai_providers` table (slug, label,
 *      placeholder, capabilities, help_url, sort_order).
 *   2. Implement this interface in `src/lib/ai/adapters/<slug>.ts`.
 *   3. Register the adapter in `src/lib/ai/adapters/registry.ts`.
 *
 * Settings UI, validation, model refresh, and the keys API auto-pick
 * the new provider up — there is no hardcoded provider list anywhere
 * in the UI or in the validation pipeline.
 *
 * The runtime AI call paths (`resolve-ai.ts`, `get-user-ai-client.ts`)
 * stay outside this abstraction on purpose: each provider's SDK has
 * a different request/response shape, and the per-provider switch is
 * a deliberate, small touch when a provider lands.
 */

export interface ModelEntry {
  /** Provider's model identifier (sent to the API), e.g. "gpt-4.1". */
  value: string;
  /** Human-readable label for UI, e.g. "GPT-4.1". */
  label: string;
}

export interface ValidationResult {
  ok: boolean;
  /** Surface-able error string when ok=false. */
  error?: string;
}

export interface ProviderAdapter {
  /** Matches `ai_providers.slug`. */
  slug: string;

  /**
   * Lightweight key validation. Adapters should hit a cheap endpoint
   * (typically the provider's models list) rather than burning tokens
   * on a chat completion. Network failures should bubble up so the
   * caller can decide retry policy; auth failures should resolve to
   * `{ ok: false, error: ... }`.
   */
  validateKey(apiKey: string): Promise<ValidationResult>;

  /**
   * Fetches the current model catalog from the provider, filtered to
   * supported families for the requested kind.
   *
   * - Return `null` when this provider does not expose a public models
   *   endpoint (e.g. Perplexity); the registry then falls back to the
   *   adapter's static `staticModels(kind)` list.
   * - Return `[]` when the endpoint succeeded but no models in this
   *   `kind` are available with this key (rare; Free-tier limitations,
   *   etc.).
   * - Throw on network / 5xx / rate-limit errors so the caller can
   *   apply its retry policy.
   */
  fetchModels(
    apiKey: string,
    kind: "text" | "image"
  ): Promise<ModelEntry[] | null>;

  /**
   * Hardcoded fallback list, used when:
   *  - `fetchModels` returned null (provider has no models endpoint), or
   *  - `fetchModels` failed all retries and we need *something* to seed
   *    a fresh database (no existing rows to keep).
   *
   * Should be kept short and curated — only models the app actively
   * supports. This list lives in code (not the DB) because it pairs
   * with adapter-specific filter logic.
   */
  staticModels(kind: "text" | "image"): ModelEntry[];
}
