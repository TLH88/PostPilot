# PostPilot - Activity Log

> Tracks development sessions, decisions, and changes.

---

## 2026-04-24 Part 2: Pre-GTM Sprint 1 kickoff — BP-123 cost study + BP-126 local-dev login

Follow-up to the morning planning session. Executed two EPIC-1 items end-to-end.

### BP-123 — Token Cost Study (deliverable)
- **Memo written:** [docs/cost-studies/2026-04-token-cost-study.md](cost-studies/2026-04-token-cost-study.md)
- **Data pulled** via Supabase MCP (`ai_usage_events`, `usage_quotas`, `post_image_versions`, `creator_profiles`) — 36 logged AI events over 11 days, 2 distinct users, Tony's account (`3cbf1932-...`) as the baseline "heavy active user" proxy per owner direction.
- **Findings that need owner sign-off before BP-116 / BP-117 can proceed:**
  1. Switch default system model from gpt-4.1 → gpt-4.1-mini for chat/brainstorm/enhance/draft. ~78% per-call cost reduction at no user-visible quality cost.
  2. Default system-key image gen to gpt-image-1 ($0.040) not gpt-image-1.5 ($0.050) — 20% saving.
  3. **Recommended Personal quotas:** 30 posts / 20 brainstorms / 150 chats / 30 image gens per month. Covers Tony's usage profile with 0.9–1.6× headroom. Worst-case cost: $3.23/mo (or $1.57 with model swap) against $20 revenue = 84–92% margin.
  4. Personal at $20 is viable.
  5. Prompt caching opportunity on brainstorm (currently 0% cache hit due to BP-009 history injection rotating context every call) — restructure prompt for stable prefix or switch to Anthropic Haiku for 90% cached-read discount.
- **Break-even math:** 7 Personal users or 4 Pro users cover $130/mo infra. Realistic GTM target: 15 paid users across tiers within 90 days.
- **Data gaps flagged:** BP-085 logging only covers brainstorm/chat/image-gen routes. enhance/hashtag/analyze-hook/draft/idea-generate are NOT logged — follow-up BP worth creating to close the observability gap before GTM.

### BP-126 — Safe Local-Dev Auth Bypass (Done, verified on localhost)
Replaces the removed `/api/dev/auto-login` (deleted 2026-04-23 for security). Three independent gates, route file gitignored so it never ships to Vercel.

- **New route file (gitignored, never committed):** `src/app/api/dev/local-login/route.ts`
  - Gate 1: `NODE_ENV !== "development"` → 404
  - Gate 2: Host not in {localhost, 127.0.0.1, [::1]} → 404
  - Gate 3: `x-local-dev-secret` header missing or not matching server `LOCAL_DEV_LOGIN_SECRET` → 404
  - On pass: uses Supabase admin client to generate a magic-link token for `LOCAL_DEV_LOGIN_EMAIL` (configurable per session via `?email=` query param), redirects browser to `/callback` which exchanges the OTP and sets session cookies.
- **Login page update** (`src/app/(auth)/login/page.tsx`): Added a dashed amber "Local dev only" panel with a Dev Login button. Rendered only when `process.env.NODE_ENV === "development"` AND `window.location.hostname` is a loopback. Tree-shaken out of production builds.
- **Documentation:** [docs/dev-setup.md](dev-setup.md) — full setup instructions, explicit list of what NOT to do (never commit the route, never add `LOCAL_DEV_LOGIN_*` to Vercel env), troubleshooting section.
- **Verified** via `git check-ignore -v`: the route file matches `.gitignore:40 src/app/api/dev/**/*`. The file does not and cannot appear in `git status`.
- **End-to-end verified** on localhost: owner successfully logged in via the Dev Login button. Two setup gotchas surfaced during verification and captured in [docs/dev-setup.md](dev-setup.md): (1) the original docs said "pick a random string" without generating one, now includes `node -e "…randomBytes(32)…"` command; (2) `.env.local` values must have no surrounding quotes or they're read literally (caused an initial 12-vs-22 length mismatch). Added per-gate diagnostic logging to the route: 404 response stays opaque, but the dev-server terminal now prints which gate failed — invaluable for first-time setup.

### Tracked files that will be in the eventual commit
- `docs/BACKLOG.md` — BP-123 scope-expanded entry, BP-126 spec (already landed earlier this session)
- `docs/ROADMAP.md` — already landed earlier this session
- `docs/ACTIVITY_LOG.md` — this entry
- `docs/cost-studies/2026-04-token-cost-study.md` — new file
- `docs/dev-setup.md` — new file
- `src/app/(auth)/login/page.tsx` — dev-login button wiring

### Untracked and intentionally left alone
- `src/app/api/dev/local-login/route.ts` — per gitignore rule, must never be committed.

### Follow-up items that emerged this session (all resolved same-day)
- **Potential new BP:** wire `enhance`, `hashtags`, `analyze-hook`, `draft`, `idea-generate` routes to `ai_usage_events` so future cost studies don't re-hit the data gap. EPIC 10 (Admin & Cost Controls) is the right home. → **Created as BP-127 (P1 / High)**.
- **Potential new BP:** brainstorm prompt caching refactor (move stable prefix before volatile history; consider Anthropic Haiku for 90% cached-read discount). → **Created as BP-128 (P2 / Medium), placed in EPIC 10**.
- **Decision needed from owner before proceeding to BP-116 / BP-117:** sign off on the four recommendations in §11 of the cost-study memo. → **Owner approved all four 2026-04-24 with one amendment: Personal chat quota raised from 150 → 200/month. Cost-study memo §11 updated with approval timestamps, worst-case margin recomputed to 80.5% (current models) / 91.7% (after model swap). Still healthy.**

### Owner decisions this session (2026-04-24 late)
1. ✅ Default system model switch → mini-tier per provider (ships in BP-117).
2. ✅ System-key image gen default → `gpt-image-1` (ships in BP-117).
3. ✅ Personal quotas: 30 posts / 20 brainstorms / **200 chats** / 30 images / unlimited scheduled + versions (ships in BP-117).
4. ✅ Personal $20/mo confirmed (ships in BP-116).
5. ✅ Create BP-127 (complete AI route logging coverage).
6. ✅ Create BP-128 (brainstorm prompt caching refactor).

### BP-119 formalized into two phases (same-day owner request)
Owner asked for explicit ad placement evaluation tracking. BP-119 already covered the scope but was scoped as one monolithic item. Restructured into:
- **Phase 1 — Evaluation (S effort, memo-only):** deliverable is `docs/ad-strategy/2026-XX-ad-placement-evaluation.md`. Evaluates ad networks, format matrix, placement catalogue per tier, conversion-impact risk, revenue projection, ethical constraints. Must be owner-approved before Phase 2 starts.
- **Phase 2 — Integration (L effort):** ships a tier-aware `<AdSlot>` component across the 3–5 placements approved in Phase 1. Feature-flag support for per-user disable. Lighthouse impact capped.
BP-119 title renamed "Ad Placement Evaluation + Integration (Free + Personal Tiers)".

### Pre-GTM Sprint 2 updated scope
→ BP-117 gate refactor, BP-118 trial messaging, BP-125 image-gen BYOK, **BP-127 complete AI logging**, BP-085 admin cost controls.
Sprint 6 (Post-launch ARPU & polish) adds BP-128 brainstorm caching.

### Next action
Start BP-116 (pricing page copy + feature table rewrite) — all inputs now locked.

---

## 2026-04-24 Part 3 — BP-116 pricing page rewrite shipped (display layer)

Owner approved cost-study recommendations and gave the "proceed" signal. Shipped BP-116 end-to-end.

**Files changed (2):**
- [src/lib/constants.ts](src/lib/constants.ts) — `SUBSCRIPTION_TIERS` prices bumped to v2 ($20 / $50 / $100+$6); `TIER_FEATURES` matrix fully rewritten for v2 (feature renames, new Pro system-key quotas, Personal restrictions, ad tier split). Explicit inline comments mark the `limits` values as pre-v2 pending BP-117 migration — important so the next dev doesn't assume display and enforcement are aligned.
- [src/app/pricing/page.tsx](src/app/pricing/page.tsx) — `ANNUAL_PRICES` computed at 15% off (Personal $204, Pro $510, Team $1,020); hardcoded card prices updated; subhead rewritten ("Start free. Upgrade when you're ready for more." — removed misleading "All plans include your choice of AI provider"); 3 FAQ entries rewritten (BYOK now Pro+ only, providers supported split by tier, free trial → Free AND Personal plans trial Professional tier, billing 15% off); "BYOK Highlight" section renamed to "AI that fits your plan" with copy reflecting Free/Personal on system keys vs Pro/Team on BYOK; "(save 17%)" → "(save 15%)".

**Display/enforcement split (intentional):**
- This BP touched the **display layer** only — what users see on the pricing page.
- Quota enforcement in `SUBSCRIPTION_TIERS.limits` still carries pre-v2 values (creator: unlimited posts / 15 brainstorms / 200 chats / 15 scheduled). BP-117 will migrate those to v2-approved quotas (30 / 20 / 200 / 30 + add image_generation column) with server-side hard-stop behavior.
- During the gap between BP-116 shipping and BP-117 shipping, the pricing page will show tighter limits than are currently enforced. This is the "overly generous" direction — safe. Not the reverse.
- Trial logic (`TRIABLE_TIERS = {"creator", "professional"}`) intentionally left alone. BP-117 will restrict Personal trials since Personal is no longer the target (Pro is). Doesn't impact current FAQ because we only have 6 beta users, none paid.

**Grep sweep:**
- No remaining hardcoded old prices ($19, $49, $99, $190, $490, $990, $5.99) anywhere in `src/`.
- No "17%" or "save 17" references left.
- Old feature-name strings ("Post Scheduling", "Manual Analytics", "Hook Analysis", "Enhance & Hashtags") only appear in two help-content files: `src/components/help-sidebar.tsx` and `src/lib/tutorials/definitions.ts`. These are **BP-120** scope (help content refresh) — intentionally left for that BP to handle.
- `Ad-Free` term removed entirely from the codebase (replaced by `ad_experience` with Full / Limited / None values).

**What ships next:**
- BP-126 already Done from earlier this session.
- **BP-117** — Feature-gate refactor (supersedes original BP-018) is the logical next item in Pre-GTM Sprint 2. That's where the model swap (gpt-4.1 → gpt-4.1-mini), image-gen default change, quota enforcement, and BYOK gate all land.

**Git state at end of session:**
- Modified tracked files: BACKLOG.md, ROADMAP.md, ACTIVITY_LOG.md, `src/app/(auth)/login/page.tsx`, `src/lib/constants.ts`, `src/app/pricing/page.tsx`.
- New untracked files: `docs/cost-studies/2026-04-token-cost-study.md`, `docs/dev-setup.md`.
- Gitignored (never committed): `src/app/api/dev/local-login/route.ts`.
- Nothing committed or pushed yet — waiting for owner review.

---

## 2026-04-24: Subscription Model v2 pricing pivot + EPIC backlog restructure

Planning-only session — no code shipped. Owner directed a major strategic pivot plus a structural change to how the backlog is organized. All documentation artifacts updated; implementation work queued as BP-115–BP-126.

### Strategic pivot: Subscription Model v2
Reversed the 2026-04-01 "BYOK is default across all paid tiers" decision. New model:
- **Free ($0):** system keys only, strict quotas (3 posts / 2 brainstorms / 20 chats per month), full ads
- **Personal ($20/mo, annual $204 = 15% off):** system keys only, **no BYOK**, limited non-intrusive ads, no Content Library, no Post Templates
- **Professional ($50/mo, annual $510 = 15% off):** system keys with hard quotas (100 posts / 200 image gens / 200 brainstorms / 500 AI chats per month, unlimited scheduled + versions); BYOK unlocks unlimited everything
- **Team ($100/mo + $6/user, 15% off annual):** BYOK included and encouraged; no higher-tier trial eligibility

**Key mechanical decisions:**
- Pro-tier overage = **hard stop** (no auto-billing, no queue). Upgrade prompts offer BYOK or Team.
- System keys are **disabled** for users with valid BYOK configured (never used as fallback).
- Annual discount dropped from 17% to **15%** across all tiers.
- Free and Personal users can trial Pro (14 days, one-time, 365-day cooldown). Team users have no higher tier to trial.

### New BPs added (all under EPIC 1 "Subscription Model v2" unless noted)
- **BP-115** — Subscription Model v2 parent spec (P0 / Critical)
- **BP-116** — Pricing page copy + feature table rewrite (P0 / Critical)
- **BP-117** — Feature-gate refactor (supersedes original BP-018 scope) (P0 / Critical)
- **BP-118** — Free-tier trial-expired messaging fix (P1 / High)
- **BP-119** — Personal limited-ads + Free ad strategy (un-defers BP-045) (P2 / Medium)
- **BP-120** — Help content refresh: Personal rename, paid-feature badges, API key section header (P1 / High, EPIC 3)
- **BP-121** — Tutorial "don't show again" + settings reset (P2 / Medium, EPIC 4)
- **BP-122** — Payment methods + invoices in Settings (Deferred Revenue, EPIC 2)
- **BP-123** — Token cost study (pre-GTM action) (P1 / High)
- **BP-124** — Credit-pack purchase exploration (spec only) (P3 / Low)
- **BP-125** — Pro-tier image-generation BYOK (P1 / High)
- **BP-126** — Safe local-dev auth bypass replacing removed `/api/dev/auto-login` (P1 / High, EPIC 12)

### BP-114 scope extended
Raised from P3 to P2. Now covers both:
- **Part A:** Tier key `creator` → `personal` (original scope — DB migration, TS union, Stripe metadata).
- **Part B (new 2026-04-24):** Table rename `creator_profiles` → `user_profiles`, TS type `CreatorProfile` → `UserProfile`, all UI copy "Creator Profile" → "User Profile", help article sweep.
Overrides the earlier memory note that Creator Profile was intentionally not renamed. Owner direction: do things the most correct way possible pre-GTM.

### EPIC grouping introduced
Twelve EPICs now organize the active backlog so related work ships together. Every new BP is assigned to an EPIC at creation. Recommended execution order published as a 9-sprint theme plan in BACKLOG.md.

1. Subscription Model v2 (pricing pivot)
2. Billing & Monetization (Stripe)
3. Terminology & Help Content
4. Onboarding & Guidance
5. Team Collaboration (behind BP-098 flag)
6. Analytics & Insights
7. AI Enhancements
8. Reliability & Bug Fixes
9. Security, Authorization & Observability
10. Admin & Cost Controls
11. Quality & Testing
12. Developer Experience & Tooling

### Documentation artifacts updated
- [docs/BACKLOG.md](BACKLOG.md) — new header banner, EPIC Index, 12 new BPs, BP-114 extended.
- [docs/ROADMAP.md](ROADMAP.md) — pricing table rewritten for v2, BYOK-default decision marked reversed, two new key decisions added.
- [docs/ACTIVITY_LOG.md](ACTIVITY_LOG.md) — this entry.

### Impact on in-flight backlog items
- **BP-018** (Feature Gating Logic, P0) — original scope absorbed into BP-117. Will be marked Superseded in a follow-up.
- **BP-045** (Third-Party Ads, Deferred Revenue) — un-deferred and folded into BP-119.
- **BP-054/055** (Managed AI Access, Done) — now becomes the *default* path for Free + Personal, not just trial.
- **BP-085** (AI Usage Monitoring, P1) — priority effectively upgraded to Critical because unit economics depend on it.

### Nothing deployed
No migrations run, no code changed, no branch state modified. `develop` and `main` remain at `82d8dad`.

### Follow-up for next session
- **First up (Pre-GTM Sprint 1):** BP-123 token cost study, BP-126 local-dev login, BP-115/116/117 core pricing pivot.
- Decide Personal-tier quotas (blocked on BP-123 findings).
- Produce non-technical project review (Option B delivered in this session's final message).

---

## 2026-04-23: BP-111 token validation, Past-Due redesign, Dashboard rework, Analytics toggle

Big session of UX + reliability polish. All DB migrations applied to production Supabase via MCP. No API contracts changed.

### Reliability & security
- **BP-111 — Proactive LinkedIn token validation** (P1 / High). LinkedIn doesn't notify us when a user revokes PostPilot from their side, so the old `/api/linkedin/status` endpoint could report "connected" even when the token was dead. Shipped:
  - Migration `20260423_add_linkedin_token_validated_at.sql` — adds nullable `linkedin_token_validated_at timestamptz` to `creator_profiles`.
  - New endpoint `POST /api/linkedin/validate` — makes a live `/v2/userinfo` call against the stored token, falls back to the refresh-token flow on 401, and on hard failure clears every `linkedin_*` column on the profile. Throttled to at most one real LinkedIn call per user per hour via the new column.
  - New client component `src/components/linkedin/token-validator.tsx` mounted in `(app)/layout.tsx`. Fires once per browser session on mount; on a revoked/refresh_failed result it shows a reconnect toast and `router.refresh()`es so the existing global `LinkedInStatusBanner` surfaces immediately.
- **BP-103 migration applied to production** via Supabase MCP — contextual onboarding CTA now fully active.

### Past-Due dialog redesign
- Title changed to **"A Scheduled Post Failed to Publish to LinkedIn"** with amber caution icon pill.
- Restructured into three labeled sections: **The post that failed** → **Likely cause** → **Your options**.
- Raw LinkedIn error JSON replaced with a `humanizePublishError()` mapping (revoked, expired, 401, 429, generic).
- **Likely cause** section now always renders with a prominent **Reconnect LinkedIn** button that drives `/api/linkedin/connect`, because we can't reliably detect a revoked-on-LinkedIn's-side token. Copy adapts between "needs to be" (definite) and "may need to be" (uncertain).
- "Not yet" button removed (it was effectively a no-op — the post was already `past_due`). Remaining buttons: Reschedule, Publish now (no LinkedIn icon), I posted it manually.
- Dialog widened 480 → 600px, added `break-words` so long titles don't overflow.

### Schedule Dialog improvements
- Hour + minute inputs now use `<input list="…">` + `<datalist>` so users can type any hour 1–12 or minute 0–59 freely while still getting the preset dropdown (00/15/30/45). Values clamped and zero-padded on blur.
- Added amber feedback when the Schedule Post button is disabled: either *"Pick a date on the calendar above to continue."* or *"That time has already passed. Pick a time in the future."*
- Calendar reschedule now opens the same `LinkedInShareDialog` confirmation that the editor uses (instead of a plain toast).

### Dashboard rework
- Welcome greeting uses first name only. Subtitle + Recent Ideas description rewritten in a collaborative "creative partner" tone.
- Right column widened 20% → 24%; removed the misaligned top spacer so the Monthly Usage card now sits flush with the left column's first section.
- Recent Drafts grid: `xl:grid-cols-4` → `xl:grid-cols-3`.
- Drafts limit dropped from 5 → 3; added two new sections with the same pattern: **Recent Scheduled Posts** (purple) and **Recently Posted** (emerald). Extracted a local `PostCardsSection` helper to share the layout.
- Each of the three post sections now sits in its own themed container (colored left border + subtle background tint + icon pill) that echoes the stats row at the top.
- Recent Ideas list now shows a one-line truncated description beneath each title.
- `Info` tooltips added to every dashboard section: Recent Drafts, Recent Scheduled Posts, Recently Posted, Recent Ideas, Monthly Usage, Recent Activity. Content Balance already had one.
- AI-provider guard and onboarding banner unchanged.

### Calendar entries (dark-mode fix)
- `POST_STATUSES` and `PUBLISH_METHODS` color classes swapped: previously `bg-<color>-100 text-<color>-800` (washed out in dark mode), now `bg-<color>-800 text-<color>-100` (saturated pill + light text). Works in both modes; different statuses are now visually distinct.

### Posts page
- Scheduled removed from the **In Work** filter — scheduled posts only appear in their own tab + All.
- Tab order reorganized: **In Work · Drafts · In Review · Scheduled · Past Due · Posted · Complete · Archived · All**. In Review / Past Due still render conditionally.

### Analytics page
- `All Tracked Posts` paginated at **10 per page** (was 25).
- `Top Posts by Impressions` card renamed to **Top Performing Posts** with a toggle mirroring the Post Trends chart pattern. Flips between **Impressions** (blue bar + eye icon) and **Engagement** (emerald bar + heart icon). Engagement uses LinkedIn's aggregated `engagements` field when present, otherwise `reactions + comments_count + reposts`.

### AI prompt fix
- The em-dash rule in `src/lib/ai/prompts.ts` was silently self-defeating because the surrounding prompt text itself was full of em dashes — models strongly mimic the punctuation style of their own system prompt. Stripped em dashes from the prompt instructions; rewrote the rule to allow em dashes only when explicitly requested or unavoidably correct (e.g. quoting verbatim).

### UI / polish
- Global `LinkedInStatusBanner` "Reconnect Now" button: the `Button` component's `outline` variant turned out to be an exact copy of `default` (blue gradient), which overrode the amber utility classes. Swapped to a native `<button>` with explicit `bg-blue-600 text-white` styling that reads the same in both modes. Captured the root cause as **BP-112** (Button outline variant footgun) for later cleanup.
- Removed duplicate LinkedIn banners from Posts & Calendar — the layout's global banner already covers this. BP-104 marked **Superseded**.
- Empty-state CTA polish on Ideas filtered-empty and Posts "Complete" tab (shared component + contextual buttons).

### Backlog activity
- New: **BP-110** (Cancel In-Progress Image Generation, P2 / M), **BP-111** (shipped this session), **BP-112** (Button outline variant fix, P3 / S).
- Moved to Done: **BP-102, 103, 105, 106, 107, 108, 109, 111**.
- Superseded: **BP-104** (covered by existing global banner + BP-111 validation).

### Migrations applied to production
- `20260422_add_onboarding_current_step.sql` (deferred from yesterday's session — applied today).
- `20260423_add_linkedin_token_validated_at.sql`.

### 2026-04-23 Part 2 — Security cleanup, tier rename, merge to main

Continued the session well past the first commit. Four threads:

**1. Dev auto-login removal (security)**
- `/api/dev/auto-login` endpoint (shipped in `de60853`) plus client glue on login/signup pages were removed. Even though the endpoint had three gates (VERCEL_ENV != production, shared-secret header, email allowlist), it remained an auth-bypass surface with no compelling current use case. The intended automation flow wasn't working anyway; admin impersonation covers the real need.
- Deleted: `src/app/api/dev/auto-login/route.ts` + directory.
- Reverted the dev-only branches in `src/app/(auth)/login/page.tsx` and `src/app/(auth)/signup/page.tsx`.
- Updated the callback route comment (magic-link OTP path is now used only by admin impersonation, not dev auto-login).
- `.gitignore` simplified: the default `src/app/api/dev/*` ignore rule remains (so future dev-only tooling stays local by default); the explicit allow-rule for auto-login/route.ts was removed.
- Any Vercel env vars for this feature (`DEV_AUTO_LOGIN_TOKEN`, `DEV_AUTO_LOGIN_ALLOWED_EMAILS`, `NEXT_PUBLIC_DEV_LOGIN_EMAIL`) should be deleted from project settings — **action item for you**.
- Shipped as commit `b7184da`.

**2. Library content lock + Creator → Personal display rename**
- **Library paywall bug fix (security)**: free-tier users could view and copy built-in library items even though the upgrade banner was shown. The banner rendered above the grid but the filters, search, and cards were unconditional. In `src/app/(app)/library/page.tsx`, the entire content body (filters + search + grid) is now wrapped in `{canUseLibrary && (…)}`, and `loadItems` resolves the user's tier first and short-circuits before fetching `content_library` — so built-in rows never cross the wire for free users. Note: `content_library` rows with `is_builtin=true` are still RLS-readable by all authenticated users by design (they're templates). For a true server gate, a per-tier RLS policy is the correct follow-up — captured as **BP-113**.
- **Creator → Personal (display-only)**: `SUBSCRIPTION_TIERS.creator.label` in `src/lib/constants.ts` changed from "Creator" to "Personal". Internal tier key stays `"creator"` everywhere — no Stripe price-lookup changes, no DB migration, no feature-gate ripple. Also swept the 7 hardcoded user-facing references:
  - Pricing page FAQ
  - Trial API error message (`src/app/api/trial/start/route.ts`)
  - AI provider settings locked-state fallback copy
  - 3× "Creator+" feature badges + 1× "Creator plan required" tooltip in the post editor
  - "Creator Profile" (user's voice/tone profile) and "Individual Creator" (workspace type in onboarding) are intentionally unchanged — different concept, not the tier. If a future session wants a full rename (including the DB tier key), that's **BP-114** on the backlog.
- **Upgrade banner copy**: `UpgradePrompt` banner variant now reads *"<feature> requires <tier> or above"* and *"Upgrade to <tier> (<price>) or any higher plan to unlock …"*. Avoids implying Personal is the only upgrade path; keeps Pro/Team viable.
- Shipped as commit `7b523b1`.

**3. Tooltip build break fix (`675a7a8`)**
- Earlier dashboard tooltips used the Radix pattern `<TooltipTrigger asChild><button>…</button></TooltipTrigger>`. But the project's Tooltip wraps **Base UI** (`@base-ui/react/tooltip`), whose `TooltipTrigger` doesn't accept `asChild` — it renders its own button by default. TypeScript build failed in Vercel.
- Fix: dropped the wrapping `<button>` and `asChild` prop in all four tooltip sites (PostCardsSection, Recent Ideas, Monthly Usage, Recent Activity). `TooltipTrigger` now renders as the native button with className/aria-label applied directly, matching the pattern ContentPillarBalance was already using.

**4. Safe merge of develop → main**
- Before merging, discovered `main` had 4 direct-to-main hotfix commits not on develop: LinkedIn API version rollback (`d6f92f8`), ai_conversations 406 fix (`0f0e7f7`), schedule dialog dark-mode (`2e0c1b9`), admin impersonation middleware (`ad86775`). Direct `develop → main` could have silently regressed these.
- **Took the safe path**: `git merge origin/main` into develop first. Textual conflict in `src/app/pricing/page.tsx` resolved semantically:
  - Kept develop's full pricing implementation (trial flow, tier cards, "Personal" FAQ).
  - Dropped main's stale `PRICING_HIDDEN = true` kill-switch. Main's version of the pricing page was a redirect stub from when pricing wasn't ready; develop has the real page now.
  - Removed the auto-merge's duplicate `const router = useRouter()`.
  - Restored the Pricing link in the landing page nav (`src/app/page.tsx`) that the auto-merge dropped — the page is live again so it needs to be discoverable.
- Auto-merged files inspected manually: `src/components/schedule-dialog.tsx` (my datalist rewrite + main's dark-mode `bg-popover` styling both survived), `src/components/linkedin-share-dialog.tsx`, `src/app/(auth)/callback/route.ts`. All clean.
- Merge commit `82d8dad` pushed to develop.
- `git checkout main && git merge develop --ff-only` — clean fast-forward.
- Pushed main: `df61d6c..82d8dad`.
- Verified: `git log main..develop` and `git log develop..main` both empty. Branches sync.

### Backlog activity (Part 2)
- New: **BP-113** (server-side RLS gating for `content_library` built-in items), **BP-114** (full tier rename Creator → Personal including internal key + DB, only if you want end-to-end consistency).

### Current repo state (for next-session handoff)
- **Active branch**: `develop` (checked out after merge).
- **Both branches at**: `82d8dad` (merge commit that pulled main's hotfixes forward).
- **Production domain** `www.mypostpilot.app` deploys from `main` → next build will include everything shipped today.
- **Preview** `postpilot-git-develop-*.vercel.app` deploys from `develop` → same commit.
- **Migrations applied to Supabase production via MCP** (project `rgzqhyniuzhqfxqrgsdd`):
  - `20260422_add_onboarding_current_step.sql` (BP-103)
  - `20260423_add_linkedin_token_validated_at.sql` (BP-111)
- **Local dirty files** that are intentionally never committed (pre-existing across sessions): `.claude/launch.json`, `.claude/settings.local.json`, `.claude/commands/`, `docs/images/tutorial-card-dark.png`, `docs/images/ScreenShots_Before/`, `public/NPOS Favicon.png`, `supabase/.temp/`.
- **Backlog movement today**: Done — BP-102, 103, 105, 106, 107, 108, 109, 111. Superseded — BP-104. New & pending — BP-110, 112, 113, 114.
- **Open items / things a next session should know**:
  - **Vercel env var cleanup**: remove `DEV_AUTO_LOGIN_TOKEN`, `DEV_AUTO_LOGIN_ALLOWED_EMAILS`, `NEXT_PUBLIC_DEV_LOGIN_EMAIL` from Vercel Preview env.
  - **New favicon**: `public/NPOS Favicon.png` is uncommitted — Tony's call whether to adopt it.
  - **Tier rename is display-only**: `SUBSCRIPTION_TIERS.creator.label = "Personal"` but the internal tier key is still `"creator"`. Stripe/DB/feature-gate all still say `creator`. BP-114 tracks the full rename if ever wanted.
  - **BP-108 migration still ongoing**: `toast.error` sites migrated in the top few call sites; ~50 remain to migrate opportunistically to the `toUserMessage()` mapper.
  - **BP-102 post-editor AI chat guard** still deferred — dashboard warning + idea-generation guard cover the primary paths, but the in-editor chat has no client-side guard yet.
  - **Known bug (still outstanding)**: auto-draft not generating when developing an idea into a post (per 2026-04-15 note).

---

## 2026-04-22: UX Improvement Run — BP-102 through BP-109 [UX-IMPROVE-2026-04-22]

Ran a functional/UX review of the app, added 8 backlog items (BP-102–BP-109) and landed all 8 in a single session. Every change is additive and behind existing permission/RLS checks; no API contracts changed.

- **BP-102 — AI-provider guard**: new `src/lib/ai/has-ai-access.ts` helper mirrors the client-safe subset of `getUserAIClient()` logic. Dashboard now renders an amber warning card when the user has no usable AI access (no BYOK key, gateway unavailable, no managed/trial access); Generate Ideas button gains a `disabledReason` prop and is disabled with a tooltip. Authoritative server-side checks in `/api/ai/*` are untouched.
- **BP-103 — Contextual onboarding CTA**: new migration `20260422_add_onboarding_current_step.sql` adds a nullable `onboarding_current_step` column. Onboarding page persists the step on each Next (fire-and-forget, RLS-scoped) and hydrates on mount. Dashboard banner now reads "Step X of 6 — <label>" with a resume link when progress exists; falls back to the prior binary copy if the column isn't present yet. Queries touching the new column are wrapped in try/catch so deploys without the migration still work.
- **BP-104 — LinkedIn connection banner**: new `src/components/linkedin/connection-banner.tsx` (server) and `connection-banner-client.tsx` (client). Rendered on `/posts` (server) and `/calendar` (client — fetches `/api/linkedin/status`). Error variant for disconnected/expired, amber warning when ≤ 7 days remain. Fails open.
- **BP-105 — BYOK copy rewrite**: settings header renamed to "AI Model (Optional)" with plain-English copy. Gateway toggle relabeled "Use PostPilot's built-in AI". Locked-state copy softened.
- **BP-106 — Past-Due clarification**: `PastDueChecker` now has an inline explainer banner and a new **Reschedule** action that opens the existing `ScheduleDialog`. Tooltip added to the Past Due tab. Reschedule only updates `scheduled_for` + status and clears `publish_error` — never publishes.
- **BP-107 — Idea→Post context**: post editor fetches and shows a "From: <idea title>" badge linking back to the idea when `posts.idea_id` is set. New-post default title changed from "Untitled Post" to `null` so the list falls back to a content preview.
- **BP-108 — Error-message mapping**: new `src/lib/errors/to-user-message.ts` classifies Supabase codes (PGRST*, 23505, 23503, 42501), HTTP statuses, network errors, RLS/permission, rate-limit, and AI-key failures. Logs raw errors for debuggability. Migrated top call sites in `ideas/page.tsx` and `new-post-button.tsx`; remaining ~60 call sites will migrate opportunistically.
- **BP-109 — Shared EmptyState + CTA fixes**: new `src/components/ui/empty-state.tsx`. Ideas filtered-empty now offers "Clear filters" + "Generate new ideas"; Posts "Complete" tab now offers "Start a draft" + "View calendar" instead of a bare "No completed posts yet."

### Deploy checklist
- Run migration `20260422_add_onboarding_current_step.sql` before / alongside the code deploy. Dashboard and onboarding are defensive and will tolerate a lag, but the contextual CTA stays in "binary" mode until the column exists.
- No other schema changes. `posts.idea_id` is already present in the schema.
- No API contracts changed. `/api/linkedin/status` response shape is unchanged.

### Deferred in this run
- **BP-102 post-editor AI chat guard**: would require refactoring the editor's client component. Left as follow-up.
- **BP-108 bulk migration of remaining `toast.error` sites**: mapper is shipped; rest can migrate opportunistically to avoid a noisy single PR.
- **BP-109 full first-run EmptyState migration on ideas/posts**: shared component shipped; first-run states already had reasonable CTAs and were not the bottleneck. Filtered / "complete-tab" dead-ends — the actual user-facing problems — are resolved.

---

## 2026-04-16: Team Collaboration Features, Trial System, Analytics Polish

### BP-087: Published Post View + BP-025 API Prep
- New route `/posts/{id}/published` — dedicated read-only view for posted content
- Redirect from editor when post status is "posted" (unless `?edit=true`)
- Full engagement analytics card with inline-editable metrics and engagement rate calculation
- "Duplicate as Draft" action creates editable copy
- "Edit Original" link opens editor with amber warning banner
- BP-025 API infrastructure: `/api/linkedin/analytics` endpoint, `fetchPostEngagement()` helper using `memberCreatorPostAnalytics` LinkedIn API
- `analytics_fetched_at` timestamp on posts, `linkedin_scopes` array on creator_profiles
- Auto-refresh button with graceful "scope required" fallback UI
- LinkedIn app approval for `r_member_postAnalytics` scope is a blocker — manual analytics entry remains the default path

### Account Lifecycle & Trial System
- Added `account_status` field: `active | trial | suspended | churned`
- Added trial tracking: `original_tier`, `trial_tier`, `trial_started_at`, `trial_ends_at`, `last_trial_tiers` (jsonb for 365-day cooldowns)
- Self-service trial flow from pricing page: click "Start Free Trial" on Creator/Pro → 14-day trial with full features and managed AI access
- `POST /api/trial/start` — validates tier, enforces cooldown, sets all trial fields
- `POST /api/trial/check-expiry` — called on app layout mount (TrialExpiryChecker component), auto-reverts expired trials to original_tier and records in last_trial_tiers
- Pricing page now context-aware: "Start Free Trial" / "Upgrade" / "Current Plan" based on user state
- Settings shows trial banner with days remaining + Upgrade link
- AI client `hasManagedAccess()` grants access to active trial users
- Admin user table shows trial start date, days remaining, tier being trialed, with quick-pick dropdown for duration

### BP-023, BP-046-051: Team Collaboration Suite
- New schema: `post_comments`, `activity_log`, `notifications`, `post_approvals` (RLS-secured)
- Posts extended with: `assigned_to`, `assigned_by`, `assigned_at`, `approval_stage`, `approval_status`
- Workspaces extended with: `workspace_type` (individual/brand), `approval_stages`, `requires_approval`, `onboarding_completed`, `brand_sample_posts`

**Shared helpers:**
- `logActivity()` — workspace activity feed
- `createNotification()` / `createNotifications()` — in-app notifications with email delivery prep fields

**BP-023: Brand/Team onboarding**
- `WorkspaceTypeSelector` component at `/onboarding/type` (Individual vs Brand/Team)
- Workspace setup wizard sets `workspace_type='brand'` and `onboarding_completed=true`

**BP-046: Post Assignment**
- `AssignPost` dropdown with badge + button variants
- Team/Enterprise users auto-assigned to their own new posts (all creation paths updated)
- Auto-notifies assignee, logs to activity feed

**BP-047: Comments**
- Threaded comments with @mentions, resolve/unresolve toggle
- Rendered inside the right panel (tabbed with AI Assistant)

**BP-048: Activity Feed**
- `ActivityFeed` component with color-coded action icons
- `/activity` page for workspace-wide feed
- Per-post timeline rendered in the editor's right panel Activity tab
- Integrated into dashboard right column
- Activity logged on: post_created, post_edited (throttled 10min), post_status_changed, post_scheduled, post_published, post_archived, post_assigned, post_unassigned, post_commented, post_submitted_for_review, post_approved, post_changes_requested

**BP-049: Notifications Center**
- `NotificationsBell` in top bar (polls every 30s, unread badge)
- `/notifications` page with unread/all filter, delete, mark read
- Email delivery prep (email_enabled, email_queued_at, email_sent_at)

**BP-050: Approval Workflow with reviewer selection**
- `SubmitForReviewDialog` lets post author pick specific reviewers per submission
- Approval API accepts `reviewers[]` array, falls back to workspace.approval_stages config
- Status transition to "review" in workspace mode intercepts and opens dialog
- Full approval history card with reviewer names and decisions

**BP-051: Review Queue**
- `/workspace/reviews` page with 3 filter tabs (awaiting me / all pending / recently decided)
- Inline quick-approve / request-changes buttons

### Team Tier Gating
- All team collaboration UI (assignment, comments, approval, activity, review queue) gated to Team/Enterprise via `hasFeature(userTier, "workspaces")`
- Non-Team users see the original single-view AI Assistant panel (unchanged UX)
- Reviews nav item hidden for non-Team users

### Post Editor Right Panel Refactor
- Replaced `chatOpen: boolean` with `panelView: "ai" | "comments" | "activity" | null`
- Team users see a tabbed panel header with all three views
- Non-Team users see the original single-view AI Assistant panel
- Active tab persists to localStorage (`postpilot_panel_view`)
- Last-used view restored on next editor load

### Workspace Data Scoping
- New helpers: `applyWorkspaceFilter()` and `getActiveWorkspaceIdServer()` (cookie-based for server components)
- Individual mode: filter `workspace_id IS NULL AND user_id = current_user`
- Workspace mode: filter `workspace_id = active_workspace_id`
- Applied across Posts, Ideas, Calendar, Dashboard, Analytics
- Idea creation paths (CreateIdeaDialog, GenerateIdeasDialog) set workspace_id from active context

### RLS fix: workspace_members visibility
- Previous SELECT policy was `user_id = auth.uid()` — users could only see their own membership row
- This broke: members page (showed only self), reviewer dialog (empty), assignment dropdown (no teammates), mention autocomplete
- Fix: SECURITY DEFINER helper functions `is_workspace_member()` and `get_workspace_role()` (avoids recursion)
- New policies: any workspace member can see all members; owner/admin can update/delete; members can leave

### Workspace Members UI
- Role dropdown on each member row (owner/admin can change any non-owner role)
- Role descriptions panel with "Can review" badges on owner/admin/editor
- Fixed invite API: was inserting inviter as placeholder; now looks up invitee by email via admin.listUsers()

### Analytics Enhancements
- Renamed chart title to "Post Trends"
- Added Engagement/Impressions toggle (theme-primary active state)
- Date range selector: Last 7/30/90 days, Year to Date, All Time, Custom (with calendar icon toggle for from/to date picker)
- Aggregation dropdown (Daily/Weekly/Monthly/Quarterly/Yearly)
- Default: Last 30 days + Weekly aggregation
- Metrics above chart update to reflect date range filter
- Total Posts metric card added
- Sortable columns on All Tracked Posts table (impressions, reactions, comments, reposts, date posted)
- Pagination (default 5, view all, 25/page) on Top Posts and Pillar Performance; 25/page on All Tracked Posts
- Clickable rows with chevron indicator

### Admin Dashboard Polish
- Colored KPI cards with left borders and tinted icon circles (matches analytics page style)
- Usage Trends chart uses same date range selector + aggregation dropdown
- AI Usage page KPI cards colored (spend/requests/avg-cost/users/route/gateway/cache/success)
- Recent Signups filtered to last 30 days, capped at 10
- "View All" links on both Recent Signups and Trials Expiring Soon tables
- Admin users table trial column: progress bar + days remaining + trial start date + tier

### Database Migrations Applied
- `20260416_add_analytics_fetched_at.sql`
- `20260416_add_account_status.sql`
- `20260416_add_trial_fields.sql`
- `20260417_add_team_features.sql` (posts extensions + new tables)
- `20260418_fix_workspace_members_rls.sql`

### Backlog Updates
- BP-087 DONE
- BP-025 API prep done (deferred pending LinkedIn scope approval)
- BP-023, BP-046, BP-047, BP-048, BP-049, BP-050, BP-051 all DONE

---

## 2026-04-15 (Session 2): Announcements, Settings, Admin Charts

### Admin Announcements
- AI-powered draft generation using `createMessage` (non-streamed) with `verifyAdmin()` auth
- Preview button on each announcement card showing user-facing rendering
- Shared `ReleaseNotesContent` component extracted for reuse across admin preview and user modal
- Expandable text fields (resize-y) for Description, Features, Bug Fixes, Roadmap
- Fixed header overlap with theme toggle (added right padding)

### Release Notes Modal Improvements
- Version pills replace pagination arrows for browsing past announcements
- Pills use FilterPill styling pattern (primary color for active, border for inactive)
- Semantic version sorting ensures newest version is always first (leftmost pill)
- Supports external opening via `externalOpen` prop (used by Settings page)
- Stabilized fetch logic with `useRef` guard to prevent race conditions

### Settings Page
- New "Announcements" section with "View Release Notes" button opening the modal
- Reordered sections: Announcements, LinkedIn Posting, Appearance, AI Provider, Session

### Admin Dashboard - Usage Trends Chart
- Added "Day over Day" filter option to the period dropdown
- Fixed x-axis labels: Day ("Apr 15"), Week ("Mar 30"), Month ("Mar 2026"), Quarter ("Q1 2026"), Year ("2026")
- Rewrote `getUsageTrends` to query actual source tables (posts, ideas, ai_usage_events) instead of monthly usage_quotas aggregates, fixing the single-datapoint bug

---

## 2026-04-15: Tutorial SDK, BP-086, Calendar & Admin Improvements

### Tutorial SDK Phase 1 (Standalone Package)
- Built `@postpilot/tutorial-sdk` as standalone npm package in `packages/tutorial-sdk/`
- Set up npm workspaces monorepo structure
- Backend-agnostic architecture with adapter interfaces (LocalStorage + Supabase)
- Core engine: state machine with subscribe pattern, action detector (click/navigate/formInput/elementExists), 15s timeout timer
- Card templates: OverviewCard (media slot) + SimpleCard (minimal) with animated border beam effect (SVG stroke-dasharray animation using primary color)
- TutorialGate: first-login "Want a tour?" modal
- TutorialOverlay: CSS clip-path spotlight, element tracking, native pointer drag (replaces framer-motion drag)
- Tutorial chaining: `chainToTutorialId` field auto-starts next tutorial on completion
- Navigation awareness: tutorial auto-closes if user navigates away from the expected page
- Tutorial list slide-out: right-side panel on final cards showing all other tutorials
- Theming: CSS custom properties applied to document root (no wrapper div that breaks portals)
- Supabase tables: `tutorial_progress` + `tutorial_user_state` with RLS policies

### Tutorials Implemented (8 total)
1. **Full Application Overview** (4 steps) — sidebar nav, settings, theme/logout, chains to idea generation
2. **Dashboard Overview** (7 steps) — metrics, quick actions, drafts, recent ideas, usage, content balance, tutorial list
3. **Idea Bank Overview** (5 steps) — workflow, generator, filters, cards
4. **Posts Page Overview** (4 steps) — metrics, new post, filters, cards with action buttons
5. **Calendar Page Overview** (6 steps) — intro, grid with color coding, views, upcoming posts, card/list toggle
6. **System Management Overview** (3 steps) — settings (with BYOK note), help center, profile (navigates to each page)
7. **How to Generate Ideas with AI** (5 steps) — formInput detection for topic, click detection for Generate button, elementExists for generated ideas, manual save selection
8. **How to Develop an Idea into a Post** (10 steps) — navigate detection for Develop click, progress bar, AI draft, Apply to Editor, content editing, emojis/formatting, AI chat, hashtags, versions, publish

### Action Detector Improvements
- Multi-strategy detection: capture-phase event listeners + DOM polling (300ms) + MutationObserver
- `formInput` action: polls input value directly (handles React-controlled inputs), listens for input/change/keyup events, finds inputs inside wrapper components
- `elementExists` action: combines polling with MutationObserver for faster detection
- `navigate` action: supports prefix matching (e.g., `/posts` matches `/posts/abc-123`)
- All strategies share a single `complete()` function with fired-once guard

### BP-086: Show Directly Published Posts on Calendar
- New `publish_method` column on posts table: `'scheduled'` | `'direct'` | `'manual'`
- Migration with backfill for existing posted posts
- Publish API sets method based on whether `scheduled_for` was set
- Mark-posted-dialog and past-due-checker set `publish_method: 'manual'`
- Calendar query updated: `.or("scheduled_for.not.is.null,status.eq.posted")`
- `postsByDate` uses `scheduled_for ?? posted_at` as date key
- Upcoming Posts panel unchanged (forward-looking only, excludes posted)
- `PUBLISH_METHODS` constants with distinct colors (green/blue/teal)

### Calendar Improvements
- LinkedIn-style hover preview on post pills (author info, content preview, image, pillars)
- Conditional action buttons: Edit + Reschedule for scheduled, Edit + View on LinkedIn for posted
- Preview dialog (centered modal) with LinkedIn preview and conditional buttons
- Preview button added to Upcoming Posts card view
- Tour IDs added: `#tour-calendar-grid`, `#tour-upcoming-view-toggle`

### UI Polish
- Darker light theme background (`oklch(0.955)` from `0.98`), blue card glow (light + dark)
- Card images flush to top with overlaid status pills (dashboard, posts, calendar)
- Post preview sheet on calendar (replaces navigation)
- Card/list view toggle for Upcoming Posts
- Outlined Actions/Copy buttons, Idea Bank search borders, tag hint color
- Brainstorm: floating selection button replaces right-click context menu (restores native spelling)
- Engagement analytics moved from bottom of editor to below progress bar
- Tour IDs added across posts page, calendar, top bar, idea generator

### Admin Announcements
- AI-powered draft generation: reads `docs/ACTIVITY_LOG.md` and `docs/BACKLOG.md`
- New API endpoint `/api/admin/announcements/generate` using `createMessage` (non-streamed)
- Generates structured JSON: title, description, features, bug fixes, roadmap
- Admin reviews and edits before saving/publishing
- Uses `verifyAdmin()` for secure admin authentication (email whitelist)

### Backlog Items Added
- **BP-086:** Show Directly Published Posts on Calendar (completed)
- **BP-087:** Published Post View — separate `/posts/{id}/published` route for posted content analytics

### Known Bug — Auto-Draft Not Generating
- **Issue**: When developing an idea into a post, the AI should automatically generate an initial draft in the editor. This is not happening.
- **Status**: Documented for separate investigation. Not blocking tutorials.

### Removed from Editor
- "Start Initial Draft" button and "Use Template" picker removed from empty editor state

---

## 2026-04-11 (Evening): Idea Bank — Manual Entry + Tagging + Prioritization

Shipped both promised-but-missing Ideas page features in a single branch after merging the AI Gateway work to `develop`.

### BP-082: Manual Idea Entry
- New `CreateIdeaDialog` component (`src/components/ideas/create-idea-dialog.tsx`) with Title, Description, Content Pillar (optional), Priority, and Tags fields. Writes to `ideas` table with `source='manual'`, `status='captured'`.
- New "Add Idea" outline button on the Ideas page header, next to the primary "Generate Ideas" button.
- No AI calls, no quota impact — manual entry is always free.
- Available on all tiers.

### BP-083: Idea Tagging & Prioritization
- **Database:** `20260412_add_idea_priority.sql` adds `ideas.priority text CHECK (priority IN ('low','medium','high'))`. Nullable — "no priority" is a valid state.
- **Constants:** new `IDEA_PRIORITIES` object in `src/lib/constants.ts` with label/color/order for high/medium/low. Deliberately distinct from the removed temperature palette.
- **Reusable `<TagInput />` component** at `src/components/ui/tag-input.tsx`. Enter or comma commits a tag, Backspace on empty input removes last, × button removes any chip, case-insensitive dedupe, optional `maxTags` limit. No external library.
- **Ideas list page** (`src/app/(app)/ideas/page.tsx`):
  - New Priority filter row (All / High / Medium / Low / No Priority)
  - New Tags filter row — only rendered when at least one idea has tags; shows active filter chips; clicking a tag on any idea card adds it to the filter
  - `filteredIdeas` extended to AND status + priority + tags + search
  - `EditIdeaDialog` now includes Priority pill selector and `<TagInput />`
  - Idea cards show a color-coded Priority badge top-left when set; Status badge top-right; content pillars and tags in separate rows; tag chips are clickable to filter
  - "Clear filters" resets all filter state
- **Idea detail page** (`src/app/(app)/ideas/[id]/page.tsx`):
  - Priority selector with pill UI
  - Tag editor replaced with reusable `<TagInput />`
  - Priority badge in page header
  - Removed legacy `addTag`/`removeTag`/`newTag` state (dead code)
- **Process flow copy:** updated `src/components/ideas/idea-process-flow.tsx` step 2 from "Rate, tag, and prioritize" to "Tag and prioritize" (rating wasn't in scope).

### Verification
- `tsc --noEmit`: clean
- Lint on touched files: 0 errors, 0 warnings
- Manual end-to-end browser test:
  1. Clicked "Add Idea" → dialog opened with all fields
  2. Entered title + description, selected High priority, added `test-tag`
  3. Clicked Save → toast appeared, new idea at top of list
  4. DB row confirmed: `source='manual'`, `priority='high'`, `tags=['test-tag']`, `status='captured'`
  5. New idea card shows red **High Priority** badge + `test-tag` chip
  6. Tags filter row appeared once the idea had a tag
  7. Clicking the `test-tag` chip filtered list from 20 → 1
  8. Clicking High priority pill filtered list from 20 → 1 (same idea)
  9. Clicking Edit on the card opened EditIdeaDialog pre-filled with title, high priority pill active, tag chip visible
  10. Test idea deleted via SQL after verification

### Branch flow
- Merged `feature/ai-gateway-integration` into `develop` first as a clean unit (commit `65d0932`): 31 files, +2023/-557, brought in BP-076 through BP-081 and the BP-082/083/084 scoping docs.
- New branch `feature/ideas-tags-priority-manual` created from `develop` for this work.

### Files Modified
- New: `src/components/ui/tag-input.tsx`
- New: `src/components/ideas/create-idea-dialog.tsx`
- New: `supabase/migrations/20260412_add_idea_priority.sql`
- `src/lib/constants.ts` — added `IDEA_PRIORITIES` + `IdeaPriority` type
- `src/types/index.ts` — added `priority` field to `Idea` interface
- `src/app/(app)/ideas/page.tsx` — filter state, filter UI, card rendering, EditIdeaDialog, Add Idea button, CreateIdeaDialog mount
- `src/app/(app)/ideas/[id]/page.tsx` — priority selector, reusable TagInput, header badge
- `src/components/ideas/idea-process-flow.tsx` — step 2 copy update

---

## 2026-04-11: Settings Copy Polish, Collapsible UI Tightening, Idea Temperature Removal, Idea Bank Scoping, Tutorial Card Redesign Scoping

### Idea Bank Scoping (BP-082, BP-083)
- Scoped **manual idea entry** (BP-082) as a medium-priority feature. Ideas page copy promises manual entry but no UI exists today. Scoped as a lightweight `CreateIdeaDialog` with title/description/pillar fields that writes `source='manual'` to the existing ideas table — no schema changes required.
- Scoped **idea tagging and prioritization** (BP-083) to match the "Rate, tag, and prioritize your best ideas" copy on step 2 of the idea process flow. Includes a new `ideas.priority` column (low/medium/high, nullable), a reusable `<TagInput />` component, priority + multi-select tag filter rows on the Ideas page, and a click-tag-to-filter discovery pattern. Full mockups for the idea card, edit dialog, and filter bar included in the backlog entry, along with an end-to-end example user workflow for triaging freshly-brainstormed ideas.

### Tutorial Card Redesign Scoping (BP-084)
- Owner provided light and dark theme reference mockups for a redesigned tutorial card. Current card is solid-primary-blue with white text, compact header, small bottom progress bar, and no media slot.
- Scoped **BP-084 (high priority)** to replace the current card with a system-themed design: `bg-card` + border, top-left "STEP X OF Y" pill, top-right close button, prominent 16:9 media slot (image/gif/video + placeholder fallback), bold title, muted description, full-width primary CTA (`Next →` / `Finish`), and a `SKIP TUTORIAL` text link below.
- Added a new `media?: { type, src, alt?, poster? }` field to the `TutorialStep` schema so steps can optionally include visual content. Backwards compatible — existing steps render with a placeholder icon until media is added incrementally.
- Updated `docs/GUIDED-TOURS-REQUIREMENTS.md` to v1.1 with a full "Tutorial Card Visual Design" section containing the layout spec, theme rules, schema changes, and reference mockup paths (`docs/images/tutorial-card-light.png` and `docs/images/tutorial-card-dark.png` — owner to save the attached screenshots to those paths).
- BP-084 is scoped to the **visual redesign only**. The owner has flagged that the tutorial system overall is not functioning properly (state bugs, targeting issues) — those fixes are a separate future BP.

---

## 2026-04-11: Settings Copy Polish, Collapsible UI Tightening, Idea Temperature Removal

### Settings Page Copy (BP-079)
- Rewrote the Settings page intro and the AI Provider card description for non-technical readers. The AI Provider card now leads with "PostPilot includes built-in AI for everyone, so most users don't need to do anything here", names OpenAI and Anthropic by name instead of jargon, and treats "BYOK" as a side note rather than a feature name users need to learn.

### AI Provider Collapsibles (BP-080)
- Collapsed the Text AI Providers list by default (was always-open).
- Replaced the small uppercase muted-text section headers with bordered card-style buttons that include a section icon, label, a configured-count badge where applicable, and a chevron that flips on expand. Applies to all 3 collapsibles: Text AI Providers, Configure Text AI Provider Key, Image Generation Providers.
- All headers now expose `aria-expanded` for accessibility.

### Idea Temperature Removal (BP-081)
Removed the idea temperature feature (hot/warm/cold) entirely. It provided no clear product value and added UI clutter + extra AI constraints without helping users prioritize.

**Database:** `20260411_remove_idea_temperature.sql` drops `ideas.temperature` (was nullable text defaulting to `'warm'`). Applied via Supabase MCP.

**Code removed or simplified:**
- `src/types/index.ts` — removed `temperature` field from the `Idea` interface
- `src/lib/constants.ts` — deleted the `IDEA_TEMPERATURES` constant
- `src/lib/ai/prompts.ts` — removed the "CRITICAL — Temperature distribution" block and `suggestedTemperature` field from `BRAINSTORM_INSTRUCTIONS`. The brainstorm prompt now simply asks for a mix of timely/evergreen/niche angles without a formal taxonomy.
- `src/lib/tooltip-content.ts` — deleted `temperatureHot`, `temperatureWarm`, `temperatureCold` tooltip entries
- `src/app/api/ai/brainstorm/route.ts` — dropped `temperature` from the recent-ideas history select
- `src/components/ideas/generate-ideas-dialog.tsx` — removed temperature mapping and badge display
- `src/app/(app)/ideas/page.tsx` — removed temperature edit dialog, filter pills, filter state, card badge, and `tempFilter` state
- `src/app/(app)/ideas/[id]/page.tsx` — removed temperature state, select UI, save payload field, and header badge
- `src/app/(app)/dashboard/page.tsx` — removed `IDEA_TEMPERATURES` import, temperature from the recent ideas select, and the badge render
- `src/app/(app)/help/page.tsx`, `src/components/help-sidebar.tsx`, `src/lib/tutorials/tutorial-definitions.ts` — updated copy to drop mentions of the temperature feature

**Verification:**
- TypeScript `tsc --noEmit`: clean
- `grep -rn "temperature|IDEA_TEMPERATURES|tempFilter" src/` returns zero matches (AI model sampling temperature params were never used in the codebase)
- Dev server restarted with cleared Turbopack cache to flush stale compile errors
- `/dashboard`, `/ideas`, `/ideas/[id]`, `/settings` all return 200 with no console errors
- Ideas table schema confirmed: 11 columns, `temperature` removed

---

## 2026-04-10: Vercel AI Gateway Integration & AI Provider Settings Overhaul

### Phase 1: AI Gateway Core Integration (BP-076)
- **Evaluated Vercel AI Gateway** vs. current direct-to-provider implementation. Key benefits: unified billing for managed-access users, automatic provider fallbacks, prompt caching, per-project usage/spend tracking, zero markup on tokens, $5/mo free credits per Vercel team.
- **Zero-dependency approach:** reused existing `OpenAICompatibleClient` with a gateway `baseURL` override instead of installing the Vercel AI SDK. The gateway speaks OpenAI Chat Completions, so the existing streaming code path (SSE `data: {"text":"..."}`) works unchanged.
- **New helpers in `src/lib/ai/providers.ts`:**
  - `toGatewayModelId(provider, modelId)` maps `claude-sonnet-4-6` → `anthropic/claude-sonnet-4-6`
  - `createGatewayClient(provider, model)` returns an `AIClient` pointed at `https://ai-gateway.vercel.sh/v1`
  - `OpenAICompatibleClient` constructor extended with optional `baseURLOverride` and `defaultHeaders` params
- **Routing logic in `src/lib/ai/get-user-ai-client.ts`:** managed-access (non-BYOK) requests now route through the gateway when `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` is set. Falls back to direct `SYSTEM_AI_KEY_*` env vars if neither is configured.
- **OIDC token preferred over API key** in deployments — `VERCEL_OIDC_TOKEN` is auto-injected by Vercel and associates gateway requests with the PostPilot project in the gateway dashboard (fixes the "No Project" attribution issue). API key remains the fallback for local dev.
- **App attribution headers:** `x-title: PostPilot` and `http-referer` sent with every gateway request for observability + featured-app listings.
- **Routing logs** added: `[AI Gateway] FORCED {provider}/{model} via user setting` and `[AI Gateway] Routing {provider}/{model} via Vercel AI Gateway` for Vercel function log visibility.

### Phase 2: Force Gateway Toggle (BP-077)
- **New column:** `creator_profiles.force_ai_gateway` (boolean, default true) — testing/dev toggle that bypasses BYOK keys entirely and forces all AI requests through the gateway.
- **UI toggle** added to Settings > AI Provider card; writes to `force_ai_gateway` via `/api/settings/ai-provider` POST. Takes precedence over all BYOK key lookups in `getUserAIClient`.
- **Migration flipped all existing users to `force_ai_gateway = true`** so the gateway becomes the default routing path going forward. Users can opt back out via the toggle if they prefer direct BYOK.

### Phase 3: Settings Page Overhaul (BP-078)
- **Gateway toggle moved to the top of the AI Provider card** with user-friendly copy: *"Route AI requests through PostPilot's managed gateway for automatic provider fallbacks, unified billing, and the best reliability."*
- **Configured Text AI Providers list** now shows all 4 providers (Anthropic, OpenAI, Google, Perplexity) in a fixed order. Each row shows:
  - Green **Configured** badge when `tested_at` is set
  - Blue **Active** badge for the currently-selected provider
  - **Setup Provider** button for unconfigured providers (auto-expands the config form and selects the provider)
  - **Switch to** / Trash buttons for configured-but-inactive providers
- **Text AI key configuration form** is now collapsible (collapsed by default). Opens automatically when clicking Setup Provider.
- **New Image Generation Providers section** (collapsible, collapsed by default) for configuring dedicated image API keys. Writes to `ai_provider_keys` with `key_type='image'`, separate from text AI keys.
- **Tier gating:** entire BYOK config (everything below the gateway toggle) is gated to **Professional+**. Free and Creator tiers see the gateway toggle locked ON and an upgrade overlay with a link to /pricing.

### Phase 4: Database Schema Extensions
- **`ai_provider_keys` extended:**
  - New `key_type` column (`'text' | 'image'`, default `'text'`)
  - New `tested_at` column (nullable timestamptz) — set on successful key test, cleared on save
  - Replaced `UNIQUE(user_id, provider)` with `UNIQUE(user_id, provider, key_type)` so users can have separate text + image keys for the same provider
- **`creator_profiles.force_ai_gateway`** default changed from `false` to `true`, existing rows migrated.
- **All 3 existing provider keys** for the owner account correctly migrated to `key_type='text'`, `tested_at=null`.

### Phase 5: Backend API Updates
- **`/api/settings/provider-keys`** — all methods now accept a `keyType` query/body param (default `'text'`). Mutating endpoints (POST/DELETE/PATCH) enforce `hasFeature(tier, 'byok_ai_keys')`, returning 403 for Free/Creator tiers. GET still returns only safe metadata (`id, provider, key_type, is_active, tested_at, timestamps`) — no ciphertext.
- **`/api/settings/test-ai-key`** — persists `tested_at` on successful test. Accepts `keyType` param.
- **`/api/ai/generate-image`** — prefers `key_type='image'` keys in `ai_provider_keys`, falls back to `key_type='text'` if no image-specific key is configured. Added `[Image Gen]` routing logs.
- **`getProviderApiKey(provider, keyType?)`** — now keyType-aware. For `keyType='image'`, the legacy fallback correctly checks `creator_profiles.image_ai_*` columns instead of `ai_api_key_*`.
- **New feature gates** in `src/lib/constants.ts`: `byok_ai_keys: "professional"`, `byok_image_keys: "professional"`.

### Phase 6: Security Audit & Cleanup
- **Full security audit** of client-side data exposure. Findings:
  - ✅ RLS enabled with correct `auth.uid() = user_id` policies on `creator_profiles` and `ai_provider_keys` (verified via `pg_policies`)
  - ✅ No API route returns encrypted/ciphertext fields
  - ✅ No `NEXT_PUBLIC_*` env vars leak secrets; `ENCRYPTION_KEY`, `AI_GATEWAY_API_KEY`, `SYSTEM_AI_KEY_*` are all server-only
  - ✅ LinkedIn tokens decrypted server-side; only metadata returned to client
  - ✅ Admin `/api/admin/users` explicitly scrubs `ai_api_key_encrypted: undefined` before returning
  - ⚠️ **2 client components were fetching `ai_api_key_encrypted` directly via the browser Supabase client** (RLS-safe but best-practice violation). Fixed below.
- **`src/app/(app)/settings/managed-ai-status.tsx`:** removed `ai_api_key_encrypted` from the Supabase select. Uses `/api/settings/provider-keys?keyType=text` (safe metadata) to detect whether the user has a personal key.
- **`src/components/posts/generate-image-dialog.tsx`:** removed direct Supabase query for `ai_api_key_encrypted`. `loadConfig()` now fetches both text and image keys via the safe API route and builds the configured-provider list from metadata only.
- **Grep audit confirmed zero client components (`"use client"`) reference `api_key_encrypted` columns** after cleanup. All remaining references are in server components, server-only API routes, or type definitions.

### Database Migrations
- `20260410_force_ai_gateway.sql` — adds `creator_profiles.force_ai_gateway` boolean
- `20260410_extend_ai_provider_keys.sql` — adds `key_type` + `tested_at`, replaces unique constraint
- `20260410_default_force_ai_gateway_on.sql` — flips default to true and migrates existing users

### Files Modified
- `src/lib/ai/providers.ts` — gateway client factory, baseURL override, attribution headers
- `src/lib/ai/get-user-ai-client.ts` — gateway routing, force toggle, keyType-aware `getProviderApiKey`
- `src/lib/constants.ts` — new `byok_ai_keys` / `byok_image_keys` feature gates
- `src/app/api/settings/provider-keys/route.ts` — full rewrite for keyType support + tier gating
- `src/app/api/settings/test-ai-key/route.ts` — `tested_at` persistence + keyType support
- `src/app/api/settings/ai-provider/route.ts` — `forceAiGateway` field
- `src/app/api/ai/generate-image/route.ts` — image-type key preference
- `src/app/(app)/settings/page.tsx` — pass subscription tier + force-gateway to component
- `src/app/(app)/settings/ai-provider-settings.tsx` — major reorganization (~995 lines, 400+ lines changed)
- `src/app/(app)/settings/managed-ai-status.tsx` — security cleanup + unused import removal
- `src/components/posts/generate-image-dialog.tsx` — security cleanup of loadConfig
- `src/types/index.ts` — `force_ai_gateway` field on CreatorProfile

### Environment Variables Added (optional)
- `AI_GATEWAY_API_KEY` — team-scoped Vercel AI Gateway API key (local dev fallback)
- `VERCEL_OIDC_TOKEN` — auto-injected by Vercel in deployments (project-scoped attribution)
- `NEXT_PUBLIC_APP_URL` — optional, used for `http-referer` attribution header
- The existing `SYSTEM_AI_KEY_*` env vars are kept as a fallback and can be removed once gateway routing is proven stable across all environments.

### Cleanup & Housekeeping
- Removed unused `Check` import from `managed-ai-status.tsx`
- TypeScript `tsc --noEmit`: clean
- ESLint scoped to touched files: 0 errors, 0 warnings
- `depcheck` flagged `pdf-parse` as unused across all of `src/` — confirmed only appears in `node_modules`. Left in place for now; should be removed in a separate cleanup PR if the resume PDF feature is confirmed gone.

---

## 2026-04-07: Alpha Feedback Sprint - UX Overhaul, Tooltips, Workflow, AI Enhancements

### Phase 1: Quick Wins
- **No em dashes rule:** Added to AI GUARDRAILS, applies to all AI-generated content
- **Credit exhaustion UX:** Provider-specific billing links, friendly inline card in chat panel instead of raw error toasts
- **Scheduled status clarification:** Posts page, editor, and calendar now show "This post has not been published yet. It will be automatically published on [date] at [time]"

### Phase 2: Tooltip System & Post Card Actions
- **Centralized tooltip content map** (`src/lib/tooltip-content.ts`) with entries for all pages
- **TooltipWrapper component** with optional "Learn more" links that open help sidebar
- **Post card actions redesigned:** Single "Actions" dropdown replacing inline buttons; grouped sections with tooltips
- **"Mark as Posted" renamed to "Manually Posted"** with confirmation modal explaining the action
- **"Move to Review" gated to Team/Enterprise** via `review_status` feature gate
- **In Review metric card and tab** hidden for Free/Creator/Pro users
- **Product-wide tooltips** added to Ideas page, Library page, and Post editor
- **Help system expanded:** 4 new sections (Getting Started, Content Tools, AI Assistant, Scheduling)

### Phase 3: Workflow Improvements
- **Post progress bar:** Blue-themed horizontal stepper (Draft > Scheduled > Published) with timeline dates showing created_at, scheduled_at, and published_at
- **Review step** only shown for Team/Enterprise users
- **Reschedule:** ScheduleDialog accepts initialDate prop; Reschedule button in editor and Calendar page
- **Calendar hover preview:** Month view post pills show tooltip with content preview
- **Calendar upcoming posts:** Reschedule and Post Now buttons added
- **Idea process flow:** 3-step visualization at top of Ideas page (Generate > Filter > Develop)

### Phase 4: AI Enhancements
- **Deeper AI context:** Chat API now receives post status, content pillar, hashtags, and character count
- **Auto-draft from Idea Bank:** Developing an idea auto-triggers AI initial draft with idea description
- **New post toast:** "Your AI Assistant is ready to help" notification for posts created from scratch

### Phase 5: LinkedIn & Onboarding
- **LinkedIn auto-connect:** Automatically initiates posting OAuth after first login
- **Persistent LinkedIn banner:** Appears on ALL pages when disconnected; "Reconnect Now" button (no redirect to settings)
- **Content Tools onboarding step:** Introduces Content Library and Templates during setup
- **Subscription plan moved** from Settings page to Profile/Account page

### Phase 6: AI Cost Optimization
- **Model router** (`src/lib/ai/model-router.ts`): Task-based routing (simple/standard/complex) with cost tier indicators

### Additional Changes
- **Unified editor Actions dropdown:** Post to LinkedIn, Schedule Post, Manually Posted, View on LinkedIn, Revert to Draft, Revert to Review (Team+), Archive, Delete
- **Post to LinkedIn always opens preview dialog** to prevent accidental posting
- **Revert to Draft/Review** added for scheduled, past_due, and posted statuses
- **Scheduled card** uses purple color for consistency
- **Image version picker:** Thumbnail strip in editor and preview dialog for switching between image versions
- **Help sidebar:** Slide-out panel (non-modal, stays open while working) with article-based help system
- **Theme-colored glow** on all modals, dropdowns, and tooltips
- **Schedule button** added to publish preview dialog
- **`scheduled_at` column** added to posts table for progress bar timeline
- **Help content audit:** All articles updated for renamed actions, new features, and workflow changes

### Database Migration
- `posts.scheduled_at` (timestamptz) - tracks when the user scheduled the post

### New Files
- `src/lib/tooltip-content.ts` - Centralized tooltip text map
- `src/components/ui/tooltip-wrapper.tsx` - Reusable tooltip wrapper
- `src/components/posts/post-progress-bar.tsx` - Post workflow progress bar
- `src/components/ideas/idea-process-flow.tsx` - Idea workflow visualization
- `src/components/layout/linkedin-status-banner.tsx` - Persistent LinkedIn disconnect banner
- `src/components/help-sidebar.tsx` - Slide-out help panel with article registry
- `src/components/posts/image-version-picker.tsx` - Image history thumbnail strip
- `src/lib/ai/model-router.ts` - Task-based AI model routing

---

## 2026-04-04 (Session 4): System Admin Panel, Managed AI Access, Workspace Enhancements

### BP-054: Managed AI Access
- **New columns:** `managed_ai_access` (bool, default true) + `managed_ai_expires_at` (timestamptz, default now+14 days) on `creator_profiles`
- **Updated:** `src/lib/ai/get-user-ai-client.ts` — fallback chain: personal key → managed system key (if active + not expired) → error
- **New env vars:** `SYSTEM_AI_KEY_OPENAI`, `SYSTEM_AI_KEY_ANTHROPIC`, `SYSTEM_AI_KEY_GOOGLE`, `SYSTEM_AI_KEY_PERPLEXITY`
- **New component:** `src/app/(app)/settings/managed-ai-status.tsx` — trial countdown with green/amber/red status
- New accounts auto-receive 14-day managed AI access via DB defaults

### System Admin Panel
- **New route:** `/admin` — protected by `ADMIN_EMAILS` env var whitelist
- **Admin client:** `src/lib/supabase/admin.ts` — service role client + `verifyAdmin()` + `isAdminEmail()`
- **Admin Dashboard** (`/admin`):
  - 5 metric cards (users, trials, paid, posts, workspaces)
  - Alert bar for expiring trials and incomplete onboarding
  - This month's usage totals (active users, posts, brainstorms, AI messages)
  - Users by tier with colored badges
  - Recent signups (last 5)
  - Trials expiring soon (sorted by urgency)
  - Top content creators table
- **User Management** (`/admin/users`):
  - Searchable user table with clickable rows for expandable details
  - Inline tier change dropdown, AI access type dropdown (System Key/Personal Key/Team Key/Not Active)
  - Trial duration controls (7/14/30/90 days, permanent, revoke)
  - Team column showing workspace badges
  - Expandable detail panel: activity, content stats, monthly quota usage, quick actions
  - Workspace assignment/removal via Actions dropdown
  - User impersonation (magic link in new tab)
  - Optimistic state updates (no page reload)
- **Workspace Management** (`/admin/workspaces`):
  - Workspace table with owner, industry, members, posts, ideas
  - Expandable details: brand info (name, industry, UVP), audience & voice (target audience, guidelines, pillars), usage stats, team member list with roles and tiers
- **Announcements** (`/admin/announcements`):
  - Create/edit/publish/unpublish release notes
  - Title: Description format for features, bug fixes, and roadmap items
  - Preview before publishing, save as draft
- **System Settings** (`/admin/system`):
  - System AI keys status (masked values, active/missing badges)
  - Admin email whitelist display
  - Environment variable status checker
- **API Routes:**
  - `GET/PATCH /api/admin/users` — list users with stats, update tier/AI access
  - `PUT /api/admin/users` — workspace assignment/removal
  - `GET /api/admin/workspaces` — enriched workspace list with members and usage
  - `GET/POST/PATCH /api/admin/announcements` — release notes CRUD
  - `POST /api/admin/impersonate` — magic link generation (logged)

### Additional Changes
- AI chat prompt: explicit "no preamble" instructions for drafts
- Apply to Editor: client-side strip of AI filler and title repetition
- sendChatMessage: displayText param hides system prompts from chat
- What's New v1.2.0: roadmap section, scrollable modal
- Idea Bank: default filter changed to Open Ideas
- Middleware: `/pricing` added to public routes

---

## 2026-04-04 (Session 2): BP-016 Usage Quota System

### Database
- **New table:** `usage_quotas` — monthly period rows per user with `posts_created`, `brainstorms_used`, `chat_messages_used`, `scheduled_posts` counters
- **New column:** `subscription_tier` on `creator_profiles` (free/creator/professional, default: free)
- RLS policies, unique constraint on `(user_id, period_start)`, index for fast lookups

### Core Infrastructure
- **New file:** `src/lib/quota.ts` — `checkQuota()`, `incrementQuota()`, `getQuotaStatus()`, `getOrCreateQuota()`, `getUserTier()`
- **Updated:** `src/lib/constants.ts` — `SUBSCRIPTION_TIERS` with per-tier limits, `QUOTA_COLUMN_MAP`, `SubscriptionTier` and `QuotaType` types
- **Updated:** `src/types/index.ts` — `UsageQuota` interface, `subscription_tier` on `CreatorProfile`
- Monthly reset handled by period_start approach: each month auto-creates a new zeroed row

### API Endpoints
- **New:** `GET /api/quota` — returns full usage status for authenticated user
- **New:** `POST /api/quota/increment` — increments a quota counter (used by client-side actions)

### Quota Enforcement (7 AI Routes)
- `brainstorm` — brainstorms quota (check + increment after success)
- `chat`, `enhance`, `draft` — chat_messages quota (check + optimistic increment before stream)
- `hashtags`, `analyze-hook` — chat_messages quota (check + increment after success)
- `generate-image` — chat_messages quota (check + increment after success)
- All return 403 with usage info when limit reached

### Client-Side Enforcement
- `new-post-button.tsx` — checks posts quota before creation, increments after
- `posts/[id]/page.tsx` — checks scheduled_posts quota before scheduling, increments after

### Settings: Tier Selector
- **New component:** `src/app/(app)/settings/subscription-tier.tsx` — 3 tier cards (Free/Creator/Professional) with limits breakdown, current usage bars, click to switch tier
- Added "Subscription Plan" card to Settings page above AI Provider

### Dashboard: Usage Summary
- **New component:** `src/components/dashboard/usage-summary.tsx` — monthly usage card with progress bars per quota type (green → yellow → red)
- Added to dashboard right column above Content Balance

---

## 2026-04-04: UI Polish, Mobile Responsiveness, Hover Standardization

### Image Generation Prompt Fix
- **Updated:** `src/app/api/ai/generate-image/route.ts` — Fixed prompt assembly: server now always appends format, art style, and text instructions (including "Do NOT include any text") to every prompt. Previously these were only added to fallback prompts, not user-provided ones.
- **Updated:** `src/components/posts/generate-image-dialog.tsx` — Rephrased default prompt to explicitly instruct AI to "visually represent the mood, energy, and themes — do NOT render the topic text itself in the image"
- **Root cause:** Title/content were phrased as visual elements ("illustrating the concept of [TITLE]") causing AI to render them as text overlays

### Post & Calendar Image Thumbnails
- **Updated:** `src/app/(app)/posts/page.tsx` — Added `image_url` to query and post cards; shows 128px thumbnail at top of card
- **Updated:** `src/app/(app)/calendar/page.tsx` — Added image thumbnails to week/day view post cards (64px) and upcoming posts sidebar (96px)

### Posts Page Metrics
- **New:** 4 metric cards at top of Posts page — Total Posts (blue), Scheduled (amber), In Review (purple), Published (emerald)
- Each card has colored left border, icon with tinted background circle, and bold count

### Dashboard Redesign
- **Updated:** Stats cards restyled to match Posts page — colored left border, label above count, tinted icon circle on right
- **Updated:** Recent Drafts converted from list to card grid (4 columns on xl), moved above Recent Ideas
- **Updated:** 2-column layout (80/20) — main content left, Content Balance (renamed from "Content Pillar Balance") right
- **Updated:** `src/components/dashboard/content-pillar-balance.tsx` — Accepts optional `title` prop

### Hover Color Standardization
- **New CSS variable:** `--hover-highlight` in globals.css (light: `oklch(0.93 0.04 255)`, dark: `oklch(0.22 0.03 255)`)
- **Registered:** `--color-hover-highlight` in Tailwind theme for `hover:bg-hover-highlight`
- **Standardized across 10 files:** posts page, dashboard, calendar, post editor, library components, template picker, emoji picker, theme setting — all interactive elements now use consistent muted blue hover

### Mobile Post Editor Overhaul
- **AI Panel:** Collapsed by default on mobile (<1024px), auto-opens on desktop. On mobile opens as full-screen overlay (`fixed inset-0 z-50`)
- **Formatting toolbar:** Mobile dropdown ("Format") replaces individual buttons — contains Analyze Hook, Line Break, Bullet, Save to Library, Copy Post. Emoji picker and Insert from Library remain standalone.
- **Status actions:** Mobile dropdown ("Actions") replaces status-dependent buttons
- **Version management:** Mobile dropdown ("Versions") replaces Save Version, Save as New Post, Save as Template, and version history
- Desktop view completely unchanged

### Mobile Layout Fixes
- **Page headers** (Posts, Ideas, Library): Changed from `flex items-center justify-between` to `flex flex-col sm:flex-row` so title/description and action button stack vertically on mobile
- **Mobile nav:** Added missing `BookOpen` icon import and iconMap entry for Library nav item

---

## 2026-04-03 (Session 2): Image Upload, AI Image Generation, Multi-Provider Keys

### BP-039: Image Upload to LinkedIn Posts
- **New API route:** `/api/posts/upload-image` — POST (upload) + DELETE (remove) with file validation (10MB, JPG/PNG/GIF/WebP)
- **New component:** `image-upload.tsx` — shared upload + preview with Replace/Remove buttons, full-res viewer on click
- **New component:** `image-viewer.tsx` — full resolution image viewer dialog
- **Updated:** `linkedin-api.ts` — new `uploadImageToLinkedIn()` function (register → upload binary → get URN), `publishToLinkedIn()` now accepts optional `imageUrn` for image posts
- **Updated:** `/api/linkedin/publish` — fetches post image, uploads to LinkedIn, passes URN
- **Updated:** `linkedin-preview.tsx` — shows image below post content matching LinkedIn layout
- **Updated:** `publish-preview-dialog.tsx` — "Add Image" button now functional with ImageUpload component
- **Updated:** Post editor — "Post Image" section with upload, replace, remove, and AI generation buttons
- **DB migration:** Added `image_url`, `image_storage_path`, `image_alt_text` columns to posts table
- **Supabase Storage:** Created `post-images` bucket with public access + RLS policies

### BP-029: AI Image Generation
- **New API route:** `/api/ai/generate-image` — multi-provider image generation:
  - OpenAI: GPT Image 1.5, GPT Image 1, GPT Image 1 Mini, DALL-E 3, DALL-E 2
  - Google: Gemini 3.1 Flash Image, Gemini 2.0 Flash Image (native generateContent endpoint)
  - Anthropic: Not supported (confirmed — Claude cannot generate images via API)
- **New component:** `generate-image-dialog.tsx` — full-featured generation UI with:
  - Provider selector (only shows configured providers)
  - Image format: Landscape (1920×1080) / Square (1080×1080) per LinkedIn size guide
  - 8 art style options
  - Text in image: No Text / Include Text (150 char limit)
  - Editable prompt auto-populated from post content
  - Preview + Regenerate + Use This Image actions
  - `{ }` button to view full assembled prompt sent to AI
- Prompt no longer wraps title/content in quotes (prevents AI from rendering text in image)

### Multi-Provider API Key Storage
- **New table:** `ai_provider_keys` — stores one encrypted key per provider per user with `is_active` flag
- **New API route:** `/api/settings/provider-keys` — full CRUD (GET list, POST add/update, PATCH switch active, DELETE remove)
- **Updated:** `get-user-ai-client.ts` — reads from `ai_provider_keys` first, falls back to legacy `creator_profiles`
- **Updated:** Settings page — "Configured Providers" section with Switch to / Delete actions per provider
- **Updated:** Image gen dialog — fetches all configured providers and shows image-capable ones

### UX Improvements
- **Archived posts now count** in Published Posts metric and Content Pillar distribution
- **Archived posts filtered** from Recent Drafts on dashboard
- **View All buttons** on dashboard now styled blue
- **Post cards** — card grid layout with footer action buttons (matching Ideas Bank)
- **"Manually Posted"** link moved to far right of card footer
- **Idea Bank filters** — new Open Ideas / Closed Ideas grouped filters with contextual sub-filters
- **Idea Bank cards** — "Archive" label added next to icon
- **Idea Generator** — users can add new content pillars inline, saved to profile
- **Idea Generator topic** now mandatory (marked with *)
- **Calendar** — weekly and daily views added, status-colored entries, side-by-side layout with upcoming posts
- **Post page filters** — new In Work / Complete grouped tabs, All moved to end

---

## 2026-04-03 (Session 1): Major Feature Sprint — 12 Backlog Items Completed

### BP-019: Content Library
- **New table:** `content_library` with RLS, `is_builtin` flag for system examples
- **New page:** `/library` with card grid, type filters (Hook/CTA/Closing/Snippet), search, content pillar badges, usage counts
- **12 built-in example items** seeded (3 per type) with "Example" badge, visible to all users
- **Editor integration:** "Insert from Library" popover in toolbar + "Save to Library" button
- **New components:** `save-to-library-dialog.tsx`, `insert-from-library.tsx`
- **Sidebar:** Added "Library" nav item with BookOpen icon

### BP-020: Post Templates
- **New table:** `post_templates` with RLS, `is_builtin`, `is_shared` columns for community sharing
- **8 built-in templates** seeded: Story Arc, Hot Take, How-To Guide, Listicle, Question Post, Framework/Model, Lessons Learned, Myth Buster
- **Template Picker:** Dialog with Built-in, My Templates, Community tabs + preview before applying
- **"Save as Template"** button in post editor version management area
- **Share infrastructure:** `is_shared` column + RLS for community templates (Pro+ gate placeholder)
- **New components:** `template-picker.tsx`, `save-as-template-dialog.tsx`

### BP-022: Advanced Scheduling Suggestions
- **Updated:** `src/components/schedule-dialog.tsx` — Added "Best times to post" section with timezone-aware clickable suggestion pills
- **"Schedule for next best time"** one-click button auto-fills the optimal slot
- **Constants:** `SCHEDULING_SUGGESTIONS` in `src/lib/constants.ts` (Tue-Thu, 8-10 AM)

### BP-034: Past-Due Checker — Direct Publish Button
- **Updated:** `src/components/past-due-checker.tsx` — Direct LinkedIn API publish when connected, fallback to manual share
- Shows `publish_error` for failed auto-publishes, picks up `past_due` status posts

### BP-036: Emoji Picker in Post Editor
- **New component:** `src/components/posts/emoji-picker.tsx` — 250+ emojis across 9 categories with keyword search, category tabs, and All view
- Replaces the Em dash button in formatting toolbar

### BP-037: Clarify Version Management UX
- Renamed "Convert to Post" → "Save as New Post" with tooltip
- Added "Versions" label to visually separate version controls from publish actions

### BP-044: Publish Preview & Confirmation Flow
- **New component:** `src/components/posts/publish-preview-dialog.tsx`
- All "Publish to LinkedIn" buttons and Preview button now open unified preview dialog
- Actions: Cancel, Open in Editor, Add Image (stub), Approve & Publish

### Additional Fixes & Improvements
- **Sidebar "New Post" button** — fixed to create post + open editor (was navigating to list)
- **Blank post guard** — prompts user to discard or add title when leaving empty post
- **NewPostButton** — robust creation with health checks, slow/fail timers, error logging
- **Clipboard fallback** — added `document.execCommand("copy")` fallback for library and editor copy buttons
- **Post filters** — added "In Work" (drafts + review + scheduled) and "Complete" (posted + archived) grouped filters, defaulting to In Work
- **Active tab styling** — global CSS rule matching Idea Bank filter pill style (primary border + tinted bg)
- **Dialog sizing** — fixed `sm:max-w` override issue, using inline `style` for reliable max-width
- **Backlog additions:** BP-039 (Image Upload), BP-041 (Image Gen Spec), BP-044 (Publish Preview)

---

## 2026-04-03: BP-038, BP-040, BP-042, BP-043 + Backlog Updates

### BP-038: Manual Post Status Change (Mark as Posted)
- **New component:** `src/components/posts/mark-posted-dialog.tsx` — Shared dialog for marking posts as "Posted to LinkedIn" with optional LinkedIn URL input
- **Updated:** `src/components/posts/post-actions.tsx` — Expanded three-dot menu on Posts list page with status-aware actions:
  - Draft → "Move to Review"
  - Review → "Back to Draft"
  - Scheduled → "Back to Draft", "Mark as Posted"
  - Past Due → "Back to Draft", "Mark as Posted"
  - "Mark as Posted" opens dialog with optional LinkedIn URL field
- **Updated:** `src/app/(app)/posts/[id]/page.tsx` — "Mark as Posted to LinkedIn" buttons in post editor (scheduled + past_due states) now open the MarkPostedDialog instead of directly setting status, allowing users to optionally provide their LinkedIn post URL
- **Updated:** `src/app/(app)/posts/page.tsx` — Passes post title to PostActions for better dialog context

### BP-040: Fix Dashboard "New Post" Button Navigation
- **Updated:** `src/app/(app)/dashboard/page.tsx` — Replaced static `<Link href="/posts">` with `<NewPostButton>` component that creates a new post in Supabase and navigates directly to the editor
- **Updated:** `src/components/posts/new-post-button.tsx` — Added `className` and `label` props so the button can be styled to match the dashboard gradient buttons

### BP-042: Include Post Title in LinkedIn Publish & Preview
- **Updated:** `src/lib/linkedin-api.ts` — `publishToLinkedIn()` now accepts optional `title` param, prepends it as first line of LinkedIn `commentary` field (skips "Untitled Post")
- **Updated:** `src/app/api/linkedin/publish/route.ts` — Passes `post.title` to `publishToLinkedIn()`
- **Updated:** `supabase/functions/publish-scheduled-posts/index.ts` — Added `title` to post query, passes to LinkedIn publish function
- **Updated:** `src/components/posts/linkedin-preview.tsx` — Accepts `title` prop, shows it prepended to content in preview
- **Updated:** `src/app/(app)/posts/[id]/page.tsx` — Passes `title` to `LinkedInPreview`, includes title in "Copy Post" clipboard text

### BP-043: Investigate & Fix LinkedIn Disconnections
**Root causes identified:**
1. Status endpoint only checked stored `expires_at` — showed "expired" even when refresh token was available
2. Token refresh only happened at publish time — user already saw "disconnected" in UI
3. Publish route treated all refresh failures as permanent disconnection (including temporary network errors)

**Fixes applied:**
- **Updated:** `src/app/api/linkedin/status/route.ts` — Now proactively attempts token refresh when expired token is detected with a refresh token available. If refresh succeeds, returns `expired: false` with updated expiry. User sees "Connected" instead of "Expired".
- **Updated:** `src/app/api/linkedin/publish/route.ts` — Improved error handling to distinguish temporary network errors (returns 502 "try again") from genuine token expiry (returns 401 "reconnect"). Temporary failures no longer cause the editor to show "disconnected".

### Backlog Updates
- **BP-039:** Add Image to LinkedIn Post Before Publishing (Phase 1)
- **BP-040:** Fix Dashboard "New Post" Button Navigation (Phase 1) — **DONE**
- **BP-041:** Requirements Spec — In-App Image Generation & LinkedIn Image Publishing (Phase 2)
- **BP-042:** Include Post Title in LinkedIn Publish & Preview (Phase 1) — **DONE**
- **BP-043:** Investigate & Fix LinkedIn Disconnections (Phase 1) — **DONE**

---

## 2026-04-01: Full Product Evaluation + Phase 0 Implementation

### Evaluation Reports Completed
Four parallel agent teams conducted full product evaluation:

1. **UVP Evaluation** — Assessed unique value proposition delivery at 70%. Strongest asset: voice personalization (85%). Biggest gap: no analytics or feedback loop. Recommended repositioning to "The only LinkedIn tool that keeps YOUR voice authentically you."

2. **Product Evaluation** — Overall score 6.5/10. Strong AI quality (8.5/10) and code quality (8/10). Critical gaps: no direct LinkedIn posting, no analytics, no team collaboration. Recommended 4-phase roadmap over 12-18 months.

3. **Pricing Strategy** — Designed 3-tier pricing model (Free/$19/$49) with BYOK as default across all tiers. Break-even at ~8 paying users ($150/mo covers $130.42/mo costs + 15% profit). Year 1 projections: $25K-$150K ARR.

4. **QA & Code Audit** — Grade B+. No critical security issues. Found unused deps (verified actually used), missing Zod validation, console.error in production routes. All fixable items addressed.

### QA Fixes Implemented (commit `0944439`)
- Added Zod input validation schemas to all 5 AI API routes
- Added Zod response validation for brainstorm and hashtag AI outputs
- Created shared `src/lib/api-utils.ts` with `logApiError()` (API key redaction)
- Replaced bare `console.error` with structured JSON logging in 9 API routes
- Extracted hardcoded timeouts and file size limits to named constants in `src/lib/constants.ts`

### Phase 0 Features Implemented
1. **Hook Analysis Feature** (new)
   - Created `/api/ai/analyze-hook` endpoint with Zod validation
   - Added `HOOK_ANALYSIS_INSTRUCTIONS` prompt to `src/lib/ai/prompts.ts`
   - Added "Analyze Hook" button to post editor formatting toolbar
   - Displays color-coded card (green/yellow/red) with strength rating, technique, feedback, and suggested improvement
   - Uses user's own AI key (BYOK, zero cost to us)

2. **History-Enhanced Brainstorming**
   - Modified `/api/ai/brainstorm` to query user's recent posts (15) and ideas (10)
   - Injects post titles, content pillars, and statuses into AI context
   - Calculates content pillar distribution and flags underserved pillars
   - AI now avoids repeating topics and prioritizes content gaps

3. **Content Pillar Distribution** (dashboard)
   - Added "Content Pillar Balance" card to dashboard
   - Shows bar chart of posts per pillar with percentage breakdown
   - Highlights underserved pillars with yellow "needs content" indicator
   - Queries from posts table, cross-references with creator profile pillars

4. **Export to LinkedIn** (clipboard copy)
   - Added "Copy Post" button to post editor formatting toolbar
   - Copies post content + hashtags with proper formatting to clipboard
   - Shows success toast confirming ready to paste into LinkedIn

### Documentation
- Created `docs/GTM-STRATEGY.md` with pricing targets, launch plan, marketing channels, revenue projections
- Created `docs/ACTIVITY_LOG.md` (this file)

### Infrastructure
- Added dev-only auto-login via Supabase service role key (bypasses LinkedIn OAuth on localhost)
- Created `/api/dev/auto-login` endpoint (returns 404 in production)
- Updated callback route to handle magic link tokens
- Set `autoPort: false` in `.claude/launch.json` for OAuth callback compatibility

---

## 2026-04-01: LinkedIn Direct Posting + Scheduled Auto-Publishing

### LinkedIn Direct Posting (BP-013) — `main` branch
Built complete LinkedIn API integration for direct posting:

**OAuth Connect Flow:**
- Custom OAuth 2.0 flow separate from Supabase OIDC login
- Requests `w_member_social` scope for posting permissions
- CSRF-protected with HttpOnly state cookie
- Tokens encrypted with existing AES-256-GCM and stored in `creator_profiles`

**API Routes Created:**
- `GET /api/linkedin/connect` — initiates OAuth redirect to LinkedIn
- `GET /api/linkedin/callback` — exchanges code for tokens, encrypts, stores
- `POST /api/linkedin/publish` — publishes a post via LinkedIn REST API
- `GET /api/linkedin/status` — returns connection state and expiry info
- `POST /api/linkedin/disconnect` — clears stored LinkedIn tokens

**UI Changes:**
- Settings: "LinkedIn Posting" card with connect/disconnect/reconnect and expiry warnings
- Post editor: "Publish to LinkedIn" button calls API directly when connected, with loading state
- "View on LinkedIn" link displayed after successful posting
- Falls back to redirect method when not connected

**Database Migration:**
- `creator_profiles`: 9 new columns (encrypted tokens, member ID, expiry, connected_at)
- `posts`: 4 new columns (linkedin_post_id, linkedin_post_url, publish_attempts, publish_error)

### Scheduled Auto-Publishing (BP-014) — `develop` branch
Built Supabase Edge Function for automated scheduled post publishing:

**Architecture:**
- `supabase/functions/publish-scheduled-posts/index.ts` — Deno Edge Function
- pg_cron job fires every minute via `pg_net.http_post()`
- Queries posts where `scheduled_for <= now()` and `status = 'scheduled'`
- Decrypts LinkedIn tokens using AES-256-GCM (Deno Web Crypto API)
- Publishes via LinkedIn REST API, updates post with LinkedIn URL

**Security:**
- HMAC-SHA256 JWT signature verification using project JWT secret
- Validates `service_role` claim and token expiry
- Rejects forged JWTs, garbage tokens, and missing auth (verified with 4 test scenarios)

**Error Handling:**
- Retries up to 3 times on failure
- Immediately marks `past_due` on 401/403 (expired LinkedIn token)
- Stores `publish_error` for user visibility

**Deployment:**
- Edge Function deployed via Supabase CLI
- Secrets set: ENCRYPTION_KEY, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, JWT_SECRET
- pg_cron and pg_net extensions enabled in Supabase

### Branching Strategy Established
- `main` — stable, deploys to production (mypostpilot.app)
- `develop` — feature development branch for testing without impacting live users
- Created `develop` from `main` at commit `3ef30ac`

---

## 2026-03-16: Backlog Sprint (BP-001 through BP-007)

- Implemented release notes modal with DB tracking
- Added version-to-post conversion feature
- Fixed mobile help page access (slide-over drawer)
- Fixed text formatting bugs (bullets, em dashes)
- Added right-click brainstorm context menu
- Fixed hashtag double-hash display
- Improved convert-to-post button visibility

## 2026-03-09: Beta Launch

- Deployed to mypostpilot.app via Vercel
- LinkedIn OAuth authentication live
- Core features: brainstorm, draft, chat, schedule, version history
- Multi-AI provider support (Claude, GPT, Gemini, Perplexity)
