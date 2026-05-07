# Adding a new AI provider

> Last updated: 2026-05-07 (BYOK redesign Phase 1)

PostPilot's BYOK pipeline is extensibility-first. Adding a 5th, 6th, or
Nth provider is **three steps** plus optional runtime wiring — no edits to
the settings UI, validation routes, or model refresh code.

## Architecture in one diagram

```
              ┌────────────────────────────────────────────────────┐
              │  ai_providers (DB)         ai_models (DB)           │
              │  ─────────────────         ───────────────          │
              │  slug, label,              provider, model_id,      │
              │  capabilities[],           kind ('text'|'image'),   │
              │  placeholder, help_url     is_active, is_default    │
              └────────────────────────────────────────────────────┘
                            ▲                       ▲
                            │ /api/providers GET    │ /api/models?kind=…
                            │                       │
              ┌─────────────┴───────────────────────┴────────────┐
              │  Settings UI + Image dialog                       │
              │  (ai-provider-settings.tsx, generate-image-       │
              │   dialog.tsx) — purely DB-driven, no hardcoded    │
              │   provider lists                                  │
              └───────────────────────────────────────────────────┘

              ┌────────────────────────────────────────────────────┐
              │  Provider adapter (code)                            │
              │  src/lib/ai/adapters/<slug>.ts                      │
              │  ─────────────────────────────                      │
              │  validateKey(apiKey)                                │
              │  fetchModels(apiKey, kind) — live + filter          │
              │  staticModels(kind)        — fallback list          │
              └────────────────────────────────────────────────────┘
                            ▲
                            │ registry.ts (slug → adapter)
                            │
              ┌─────────────┴────────────────────────────────────┐
              │  /api/settings/test-ai-key  (validate + refresh)  │
              │  /api/settings/provider-keys POST (validate first)│
              │  /api/cron/refresh-models   (daily catalog)       │
              └────────────────────────────────────────────────────┘
```

The DB is the source of truth for *what providers exist* and *what
models they expose*. The adapter is the source of truth for *how to
talk to that provider*. UI/API code reads both.

## The three steps

### Step 1 — Insert one row into `ai_providers`

```sql
INSERT INTO public.ai_providers
  (slug, label, placeholder, capabilities, help_url, sort_order)
VALUES (
  'mistral',                                      -- slug; lowercase, unique
  'Mistral AI',                                   -- label shown in UI
  'sk-...',                                       -- key-format hint
  ARRAY['text']::text[],                          -- 'text' and/or 'image'
  'https://console.mistral.ai/api-keys/',         -- "where do I find this?"
  50                                              -- ordering in dropdowns
);
```

Save it as a Supabase migration in `supabase/migrations/`:

```sql
-- 20260601_add_mistral_provider.sql
-- (apply via apply_migration MCP, mirror in this file)
INSERT INTO public.ai_providers ...
ON CONFLICT (slug) DO NOTHING;
```

### Step 2 — Implement the adapter

Create `src/lib/ai/adapters/mistral.ts`:

```ts
import { withRetry } from "./retry";
import type { ModelEntry, ProviderAdapter, ValidationResult } from "./types";

const MISTRAL_API = "https://api.mistral.ai/v1/models";

const STATIC_TEXT: ModelEntry[] = [
  { value: "mistral-large-latest", label: "Mistral Large" },
  { value: "mistral-medium-latest", label: "Mistral Medium" },
  { value: "mistral-small-latest", label: "Mistral Small" },
];

async function callModelsEndpoint(apiKey: string) {
  const res = await fetch(MISTRAL_API, {
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
  });
  if (res.status === 401 || res.status === 403) {
    const err = new Error(`Mistral auth failed (${res.status})`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  if (!res.ok) throw new Error(`Mistral models endpoint failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === undefined) return true;
  return status >= 500 || status === 429;
}

export const mistralAdapter: ProviderAdapter = {
  slug: "mistral",

  async validateKey(apiKey): Promise<ValidationResult> {
    try {
      await callModelsEndpoint(apiKey);
      return { ok: true };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        return { ok: false, error: "Invalid Mistral API key." };
      }
      return { ok: false, error: err instanceof Error ? err.message : "Validation failed" };
    }
  },

  async fetchModels(apiKey, kind) {
    if (kind !== "text") return [];
    const rows = await withRetry(() => callModelsEndpoint(apiKey), {
      attempts: 3,
      shouldRetry: isTransient,
    });
    // Filter to families you want users to pick from. Drop deprecated
    // / fine-tunes / embeddings / etc. — keep a curated short list.
    return rows
      .filter((r: { id: string }) => /^mistral-/.test(r.id))
      .map((r: { id: string }) => ({
        value: r.id,
        label: r.id.replace(/-latest$/, "").replace(/^mistral-/, "Mistral "),
      }));
  },

  staticModels(kind) {
    return kind === "text" ? STATIC_TEXT : [];
  },
};
```

Adapter authoring guidelines:
- **Pick a cheap validation endpoint.** `/v1/models` is the universal
  choice; never hit chat completions for validation (burns tokens).
- **Distinguish transient from permanent errors** in `isTransient`. The
  `withRetry` helper takes 3 attempts, so transient failures recover
  silently; auth failures fail fast.
- **Filter aggressively.** Provider model lists include embeddings,
  fine-tunes, deprecated versions, and internal tooling. Keep the list
  short and curated to what your app actually supports.
- **Always provide `staticModels`.** The cron and on-demand refresh both
  fall back to this when the live endpoint is unreachable; it also seeds
  the catalog before the first refresh runs.

### Step 3 — Register the adapter

Add one line to `src/lib/ai/adapters/registry.ts`:

```ts
import { mistralAdapter } from "./mistral";

const ADAPTERS: Record<string, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai:    openaiAdapter,
  google:    googleAdapter,
  perplexity: perplexityAdapter,
  mistral:   mistralAdapter,   // ← new
};
```

That's it for the BYOK pipeline. Settings UI now lists Mistral, the
add-key form validates against the new adapter, the model dropdown is
populated by the live `/v1/models` response on first key save, and the
daily cron refreshes Mistral models if `SYSTEM_AI_KEY_MISTRAL` is set in
Vercel env.

## Optional Step 4 — runtime wiring

If you want PostPilot to actually *use* the new provider for inference
(not just store the key), add a case in:

- `src/lib/ai/providers.ts` → `createAIClient(provider, apiKey, model)`
  — instantiates the per-provider SDK client.
- `src/lib/ai/resolve-ai.ts` and `src/lib/ai/get-user-ai-client.ts` —
  per-provider switch for the runtime call path.

These are intentionally NOT abstracted behind the adapter interface
because each provider's SDK has a different request/response shape;
forcing them through a uniform interface would lose useful per-provider
features (system prompts, tool use, reasoning tokens, etc.).

## Cron + system keys

The daily refresh cron (`/api/cron/refresh-models`, 04:30 UTC) reads
`SYSTEM_AI_KEY_<UPPER_SLUG>` for each provider. Add the env var in
Vercel project settings to keep the model catalog fresh even when no
end-user has tested a key recently.

If `SYSTEM_AI_KEY_MISTRAL` is missing the cron won't fail — it'll log
the gap in the per-provider summary and notify admins via the
`cron_refresh_models_failure` notification type. Existing model rows
stay intact until the env var is added.

## Failure modes & expected behavior

| Scenario | What happens | Where to look |
|---|---|---|
| User pastes a bad key | Adapter `validateKey` returns `{ok: false, error}` — POST 401, key never stored | n/a (UI shows error) |
| Provider models endpoint returns 5xx | `withRetry` retries 3× with backoff, then `refreshProviderModels` returns `{ok: false}`. Existing rows untouched. | Admin notification + cron summary |
| Provider models endpoint returns 401 mid-refresh | No retry (auth failures are not transient). Existing rows untouched. | Admin notification + cron summary |
| `SYSTEM_AI_KEY_<SLUG>` env var missing | Cron summary entry: `{ok: false, error: "Missing SYSTEM_AI_KEY_<SLUG>"}`. Existing rows untouched. | Admin notification |
| Adapter not registered for a slug in `ai_providers` | Cron summary: `{ok: false, error: "No adapter registered"}` | Admin notification |
| User picks a model that's no longer in the live list | Settings UI auto-reverts to provider default on next page load (the deprecated row was marked `is_active=false` by the refresh) | n/a |

## Removing a provider

`ai_providers.is_active=false` hides it from the settings UI and the
add-key form, but leaves existing user keys alone (the FK with
`ON DELETE RESTRICT` prevents accidental key deletion). Users on that
provider continue working until they switch, then the row can be
removed properly.

To **fully remove**, after no users reference it:
1. Delete the relevant rows from `ai_provider_keys` and `ai_models`.
2. Delete the `ai_providers` row.
3. Remove the adapter file + registry entry + (if wired) the runtime
   switch case.
4. Drop the system env var from Vercel.
