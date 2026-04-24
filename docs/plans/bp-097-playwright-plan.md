# BP-097 — Playwright E2E for Free→Pro Happy Path — Research Brief

> Produced 2026-04-25 during Sprint 3 hardening. Research-only — no code written. Pending owner approval before implementation.

## 1. Repo Survey

- **Playwright: not installed.** `package.json` has no `@playwright/test`, no `playwright.config.*`, no `tests/` or `e2e/` directory.
- **No GitHub Actions workflows.** `.github/` directory does not exist — CI has never been wired up.
- **BP-126 dev-login** (`src/app/api/dev/local-login/*`, gitignored): three gates (NODE_ENV, host must be `localhost`/`127.0.0.1`/`[::1]`, `x-local-dev-secret` header). Hard-404s on any non-loopback host, so it **cannot** be reused against a Vercel preview URL without loosening its security posture.
- **LinkedIn surface:** `src/app/api/linkedin/{connect,callback,publish,status,validate,analytics,disconnect}/route.ts` — real OAuth + real publish endpoint exist.

## 2. Execution Model — Recommendation

**Option A: Playwright running in GitHub Actions, targeting the Vercel preview URL for the PR.**

Resolve preview URL inside the workflow using the `vercel/actions` deployment-wait step (or the Vercel Deployment API filtered by `github.sha`) rather than a generic wait-for-200. Set it as `baseURL` in `playwright.config.ts`.

Tradeoff vs. Option B (run Playwright from Tony's laptop against a live URL): Option B is technically compatible with the "no localhost" rule (Playwright is just a browser driver, nothing runs on localhost), but it defeats the "every PR" requirement and puts a manual step on a non-coder owner. Option C (Vercel-native checks) doesn't offer a Playwright-grade runner. **Pick A.**

## 3. Auth / Fixtures

| Option | CI-safe? | Verdict |
|---|---|---|
| Pre-seeded test user in a **dedicated Supabase test project** with LinkedIn token row pre-populated | Yes | **Recommended.** Use `storageState.json` generated once via `supabase.auth.admin.generateLink` at test setup; skip the login UI entirely on most tests. |
| BP-126 magic-link bypass | No | Localhost-only by design (host gate). Extending it to accept preview hosts re-introduces the security hole BP-126 closed. |
| LinkedIn OAuth sandbox | Partial | LinkedIn has no stable sandbox; real OAuth in CI is flaky and violates ToS for automation. Avoid. |

Have **one** E2E variant cover the actual signup UI (no pre-seed) to catch onboarding regressions; all others reuse `storageState`.

## 4. LinkedIn Publish Boundary — Confirmed

Spec is correct: tests stop at "Mark as posted" (manual flow). Real `POST /api/linkedin/publish` would create public posts on a live LinkedIn account every PR — spammy, may trigger rate limits or account lockout, and the test would need to delete the post (LinkedIn API deletion is unreliable). The `scheduled → posted` transition is pure app state and fully exercises the app-side logic we own.

## 5. CI Plumbing — Secrets Required

No workflows exist, so everything is greenfield. Need to add as GitHub repo secrets:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — to resolve per-PR preview URL
- `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY` — dedicated test Supabase project (not prod)
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` (or storageState as a base64 artifact)
- `TEST_LINKEDIN_FAKE_TOKEN` — fixture value inserted into `linkedin_connections` table

## 6. Scope Slicing — Proposed 3 Specs

1. **`auth-onboarding.spec.ts`** — signup → Individual Creator onboarding → LinkedIn row present (fake token inserted via API)
2. **`create-schedule.spec.ts`** — storageState login → brainstorm → develop idea → AI draft → schedule → calendar shows it
3. **`posted-analytics.spec.ts`** — storageState login (with a pre-scheduled post fixture) → mark as posted → enter manual analytics → dashboard reflects it

Parallelize across 3 workers. Each should come in well under 2 min; total wall-clock under 5 min as required by the BP-097 spec.

## 7. Effort & Next Step

**Effort:** ~3–5 focused days. Breakdown: 0.5d Playwright scaffold + config, 1d test-Supabase project + seeding script, 1.5d spec authoring, 0.5d CI workflow + preview-URL resolution, 0.5d flakiness shakedown.

**Recommended first concrete sub-task:** Provision the dedicated test Supabase project and write a seeding script (`scripts/e2e/seed-test-user.ts`) that idempotently creates the test user, completes onboarding rows, and inserts a fake `linkedin_connections` row. Everything else blocks on this fixture existing.

## Critical Files for Implementation (when approved)

- `package.json` — add `@playwright/test` + scripts
- `playwright.config.ts` (new) — `baseURL` from env
- `.github/workflows/e2e.yml` (new) — wait for Vercel preview, run Playwright
- `scripts/e2e/seed-test-user.ts` (new) — Supabase admin seeding
- `src/app/api/linkedin/publish/route.ts` (reference only — do NOT call from tests; mark-as-posted stays app-side)

## Open Questions for Owner

1. **Separate test Supabase project**: willing to provision a second Supabase project (cost: ~$25/mo if upgraded to Pro tier; free tier may suffice for E2E volume)? Or should CI use prod's Supabase with a dedicated test user?
2. **Vercel token**: comfortable adding a Vercel CLI token as a GitHub secret so the workflow can resolve preview URLs?
3. **Effort timing**: 3–5 focused days worth of investment before revenue launch, or defer until after Stripe (BP-015) ships?
