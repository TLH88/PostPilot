# BP-152 — RSC Prefetch 503 Investigation

> **Status:** Investigation complete · **Date:** 2026-05-04 · **Recommendation:** File a follow-up BP only if the issue recurs in QA. Do NOT ship a speculative fix this sprint.

## Original observation (UF-016)

The Sprint 0 onboarding QA agent (live walkthrough on production, 2026-05-04 ~16:55 UTC) observed:

> Out of ~10 RSC prefetch GETs on first dashboard load, 8 returned **503 Service Unavailable**: `/calendar?_rsc=...`, `/profile?_rsc=...`, `/help?_rsc=...`, `/settings?_rsc=...`, `/analytics?_rsc=...`, `/library?_rsc=...`, `/posts?_rsc=...`, `/ideas?_rsc=...`, `/dashboard?_rsc=...`.

The user-visible navigation continued to work because clicking a link triggered a full request (not a prefetch) which succeeded.

## What I checked

### 1. Vercel runtime logs — 7-day window
- Filter: `environment=production, statusCode=503` → **zero results**.
- Filter: `environment=production, query="_rsc"` → **zero results**.
- Filter: `environment=production, level=[error, warning, fatal]` → 5 results, all `/api/linkedin/status` 500s (a different, pre-existing issue with the seeded test account's `ENCRYPTION_KEY` mismatch — captured in BP-145 QA notes).
- Production deployment: `dpl_EsPR5K6a2G45YAkaobCRDoeqxQsa` (the same deployment the QA agent observed). Logs cover the QA agent's exact run window.

**Conclusion:** Vercel's logging surface does not show any 503s for this deployment over the last 7 days, including the time window when the QA agent observed them.

### 2. Middleware — `src/middleware.ts`
The middleware only runs on `/workspace/*`, `/notifications/*`, `/activity/*` (per the `config.matcher` array). **None of the failing routes match.** Middleware is not the source.

### 3. (app) layout server work
Each of the failing routes goes through `src/app/(app)/layout.tsx`, which does:
1. `supabase.auth.getUser()` — async network call to Supabase
2. `if (!user) redirect("/login")` — would yield a 307, not 503
3. `supabase.from("user_profiles").select(...)` — second async network call
4. `if (profile?.deleted_at) redirect("/goodbye")` — also 307, not 503

**Conclusion:** The layout's logic doesn't directly produce 503s. Two possible failure modes that COULD:
- Concurrent Supabase calls hitting connection pool / rate limits when 9 RSC prefetches fire simultaneously on first dashboard load.
- A serverless function cold-start exceeding Vercel's response timeout.

### 4. Reproducibility
- The 503s have not recurred in any subsequent QA run (Sprint 1 QA + Sprint 2 QA both ran against `localhost`, not prod, so they wouldn't have caught this anyway).
- Production deployment hasn't changed code-wise since 2026-04-28 (BP-145). Most recent commits to `develop` were docs only until today's Sprint 1 + Sprint 2 merges.

### 5. RSC prefetch behavior
Next.js's `<Link>` prefetches RSC payloads on viewport entry. The sidebar (`src/components/layout/sidebar.tsx`) renders 9 nav links visible on first paint, so all 9 prefetches fire simultaneously. Each prefetch is a separate HTTP request that re-executes the (app) layout's two Supabase calls.

**This is a known Next.js + Supabase scaling concern** — the standard mitigation is to memoize the layout's `getUser()` + `select()` work via `react.cache()`. PostPilot does NOT currently use `cache()` in the layout.

## Hypothesis (unverified)

First post-login dashboard load fires 9 simultaneous RSC prefetches. Each prefetch independently:
1. Validates the session cookie with Supabase Auth (network round trip)
2. Reads the `user_profiles` row (another network round trip)

Under cold-start conditions, this can exceed Vercel's per-function timeout or hit the Supabase connection-pool ceiling for ~80% of the prefetches, producing 503s. The single full-request that fires when the user clicks a link succeeds because it runs in isolation.

## Recommendation

**File a follow-up BP only if the issue recurs in a future QA run.** Reasoning:

1. **Not user-visible.** Clicking a link triggers a full request that succeeds — the failed prefetch only costs the user a few hundred ms of perceived latency, not a broken page.
2. **Not reproducible from logs.** Vercel's runtime logs don't show the 503s, suggesting either Vercel is rate-limiting them at the edge before they hit our function (in which case there's no app code to fix) or the failures are intermittent enough to evade the 7-day window.
3. **Speculative fix is risky.** Adding `react.cache()` to the layout would deduplicate the calls within a single render but doesn't help across 9 separate prefetch requests. Rewriting auth handling in the layout is high-blast-radius work for a non-user-visible issue.
4. **Better data needed.** If the issue recurs, the right next step is structured Vercel logging at the layout entrypoint (request ID + timing + Supabase response codes) so we can see exactly which call is failing and how often. That's its own BP.

## If the issue recurs — preferred follow-up plan

1. **New BP-153 "Layout-level Supabase call observability"** — wrap `supabase.auth.getUser()` and the `user_profiles` SELECT in the (app) layout with `console.log` calls that emit:
   - request URL (so we can distinguish prefetch from full request)
   - timing
   - response status + error message
   - user-id hash (not raw — privacy)
   This makes the next 503 burst visible in Vercel logs.
2. **Once we have data**, evaluate three potential fixes in order of likelihood-of-helping:
   - **Cheapest: `react.cache()` + RPC bundling** — collapse the two layout calls into one round trip via a `get_user_layout_context()` Postgres function. Reduces per-prefetch cost ~50%.
   - **Middle: defer profile fetch** — the layout only reads `onboarding_completed`, `full_name`, `subscription_tier`, `deleted_at`, `expertise_areas`, `industries`. Move the integrity-gate fields to a separate client-component check that runs once per session, not on every prefetch.
   - **Heaviest: opt the layout out of RSC prefetching** — disable Next.js prefetch on sidebar links via `<Link prefetch={false}>`. Removes the 9× prefetch load entirely at the cost of slightly slower nav.

## Closure

BP-152 marked **Investigated — no action this sprint**. UF-016 status flipped to **Wontfix (this cycle)** with a note pointing here. If a future QA agent run observes the 503s again, file BP-153 per the plan above.
