# PostPilot E2E Tests (BP-097)

Playwright-based end-to-end tests that run against **deployed Vercel URLs only** — never localhost.

## Quick start

```bash
# 1. Install deps (first time)
npm install
npx playwright install chromium

# 2. Seed test users in prod Supabase (first time, then whenever schema changes)
SUPABASE_URL=https://rgzqhyniuzhqfxqrgsdd.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
  npm run test:e2e:seed

# 3. Run tests against a preview URL
E2E_BASE_URL=https://postpilot-v1-<branch>.vercel.app \
SUPABASE_URL=https://rgzqhyniuzhqfxqrgsdd.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
  npm run test:e2e
```

## Test users

Four dedicated users, one per tier, all marked `is_test_user=true` so admin/analytics queries can filter them out:

| Email | Tier |
|---|---|
| `e2e+free@mypostpilot.app` | free |
| `e2e+personal@mypostpilot.app` | personal |
| `e2e+pro@mypostpilot.app` | professional |
| `e2e+team@mypostpilot.app` | team |

Seed script: `scripts/e2e/seed-test-users.ts` (idempotent). Teardown: `scripts/e2e/teardown-test-users.ts`.

## Auth

PostPilot uses LinkedIn OIDC as the only interactive auth method, which is not E2E-friendly. The test helper bypasses OAuth entirely:

1. Server-side: `supabase.auth.admin.generateLink({ type: 'magiclink' })` mints a one-time token.
2. Playwright navigates to the `action_link` directly; Supabase verifies and sets session cookies.
3. The browser is now authenticated; tests proceed normally.

See `tests/e2e/helpers/session.ts`.

## Security model

### What we do

- **Service role key** is loaded from env only. Never committed, never logged, never exposed to the browser.
- **Magic-link tokens** are single-use and short-lived (1 hour default). We consume them within the same Playwright step — they never leave the Node process.
- **Fake LinkedIn tokens** on test users are random base64 blobs, not decryptable by the server's `ENCRYPTION_KEY`. If a test accidentally hits the LinkedIn publish or validate path, AES-GCM decryption fails loudly — the test fails rather than posting to a real LinkedIn account.
- **`is_test_user` flag** is informational. It is not a security boundary; no feature-gate reads it. RLS on `user_profiles` (`auth.uid() = user_id`) is the actual gate.
- **No real LinkedIn publish in tests.** Specs stop at "Mark as posted" (app-side state transition) rather than calling `/api/linkedin/publish`.

### What we rely on

- Supabase RLS on every app table. Service role bypasses RLS intentionally (that is the whole point of a seed script), but the Playwright browser sessions use the test user's JWT and are subject to RLS like any real user.
- GitHub secrets for `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, etc. in CI.
- The `is_test_user` flag for future admin-query filtering (follow-up BP; for now the owner knows to ignore test rows in dashboards).

### What we do NOT protect against

- A leaked service role key. If that leaks, test users are the least of our worries — a full project compromise.
- A determined attacker who could read the CI job's environment. GitHub secret masking + branch-protected workflows are the mitigations.

## Directory layout

```
tests/e2e/
  helpers/
    session.ts          # Magic-link sign-in helper (signInAsTier)
  smoke.spec.ts         # Phase 1: proves scaffolding works
  # TODO (Phase 2):
  # auth-onboarding.spec.ts
  # create-schedule.spec.ts
  # posted-analytics.spec.ts

scripts/e2e/
  seed-test-users.ts    # Idempotent upsert of the four test users
  teardown-test-users.ts # Delete test users + auth rows

playwright.config.ts    # baseURL from E2E_BASE_URL; no webServer
```

## CI (Phase 3 — not yet wired)

Will require the following GitHub secrets:

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Resolve per-PR preview URL via Vercel API |
| `VERCEL_ORG_ID` | Same |
| `VERCEL_PROJECT_ID` | Same |
| `SUPABASE_URL` | Same as prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Magic-link token generation |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Only if Vercel Deployment Protection is enabled — bypass the SSO wall on preview URLs (see below) |

### Vercel Deployment Protection bypass

If the project has Deployment Protection on, every unauthenticated request to a preview URL redirects to `vercel.com/login?next=...`. Playwright can't proceed without going through SSO, which defeats the point of automation.

**Fix:** generate a bypass secret and pass it as a header on every request.

1. **Vercel → Project `postpilot` → Settings → Deployment Protection → Protection Bypass for Automation** → click **Add Secret** → copy.
2. **GitHub → Settings → Environments → `e2e-tests`** → add `VERCEL_AUTOMATION_BYPASS_SECRET` with that value.
3. `playwright.config.ts` detects the env var and adds `x-vercel-protection-bypass` + `x-vercel-set-bypass-cookie: samesitenone` to every request, so the Supabase verify redirect and subsequent app requests all sail through. When the env var is unset, the config no-ops.

Workflow will live at `.github/workflows/e2e.yml`. It will:

1. Wait for Vercel to finish deploying the PR.
2. Resolve the preview URL for the current commit SHA.
3. Run `npm run test:e2e:seed` (idempotent — safe to run every time).
4. Run `npm run test:e2e`.

## Adding a new spec

1. Create `tests/e2e/<feature>.spec.ts`.
2. Import `signInAsTier` from `./helpers/session` if the flow needs auth.
3. Use the `baseURL` from `playwright.config.ts` via relative `page.goto("/dashboard")`.
4. **Do not** call `/api/linkedin/publish`, `/api/linkedin/validate`, or any AI route that costs money without first stubbing the route with `page.route(...)`.
5. **Do not** start a local server. Tests always target the deployed URL.
