# PostPilot — Backlog Reprioritization (Strategic Pivot)

> **Generated:** 2026-04-16 (later same day as the system review)
> **Trigger:** Owner direction — defer billing until Free→Pro experience is validated; feature-flag all Team+ features
> **Companion to:** [docs/reviews/2026-04-16-system-review.md](2026-04-16-system-review.md)

---

## The Pivot in One Paragraph

Stop chasing revenue infrastructure. Validate that the Free, Creator, and Pro experience genuinely solves the LinkedIn-content problem we set out to solve. The Team-tier collaboration suite shipped in the last 48 hours (~3,000 LOC: BP-023, BP-046–051) becomes **technical inventory** — kept in the codebase, hidden behind a feature flag, and pulled forward only after the solo-creator path is proven viable through user feedback.

**This means:** BP-015 (Stripe) and BP-017 (Pricing checkout) come off the critical path. Everything Team+ is parked behind `NEXT_PUBLIC_TEAM_FEATURES_ENABLED=false`. New work focuses exclusively on what a single creator using PostPilot to publish to LinkedIn would experience.

---

## Reprioritization Method

For each of the 27 open backlog items, I asked four questions:

1. **Does it improve the Free→Pro experience?** (must-have if yes)
2. **Is it Team+ only?** (defer + feature flag)
3. **Is it billing/monetization?** (defer)
4. **Is it foundational for the new direction itself?** (P0)

Items were re-tiered into P0 (Foundation), P1 (Viability Critical), P2 (Polish & Engagement), P3 (Pro Differentiation), Deferred (Team+ flagged), Deferred (Revenue), Blocked, or Stale/Superseded.

---

## New Priority Tiers — Ordered Plan

### P0 — Foundation (do these FIRST; everything else depends on them)

| BP | Title | Why P0 | Effort |
|---|---|---|---|
| **BP-098 (NEW)** | Team Features Master Feature Flag | Single env-flag toggle (`NEXT_PUBLIC_TEAM_FEATURES_ENABLED`) that hides ALL Team+ UI, nav items, routes, and component blocks. Lets us ship the inventory without exposing Free/Pro users to broken/incomplete Team workflows. | M (1-2 days) |
| **BP-094** | Route-Level Tier Gating | Becomes part of BP-098 in spirit — middleware redirect for `/workspace/*`, `/notifications`, `/activity` when flag is false OR user lacks tier. Prevents URL-driven access to Team pages. | S (½ day) |
| **BP-018** | Feature Gating Logic | Formalize the `hasFeature(tier, feature)` utility into a single source of truth. All Team+ feature checks should also short-circuit to false when the master flag is off. | S (½ day) |
| **BP-088** | Authorization Audit (scoped to Free/Pro endpoints) | Critical security findings (DELETE assign bypass, comments PATCH gap) still need fixing. Scope this BP to endpoints reachable by Free/Pro users; defer Team-only endpoint hardening until Team+ is unflagged. | M (1 day) |
| **BP-095** | Observability — Kill Silent Failures | Apply across the codebase, not just team helpers. Foundation for catching real issues in alpha/beta testing. | S (½ day) |

**Total P0:** ~3-4 days. Land this in one sprint before any other work.

---

### P1 — Free→Pro Viability Critical (the product must work)

These are the bugs and gaps that prevent a solo creator from successfully completing the core loop: brainstorm → develop → publish → analyze.

| BP | Title | Notes |
|---|---|---|
| **BP-035** | Guided Tutorial — Functional Cleanup | Tutorial SDK Phase 1 shipped (a882b19), but BP-084 explicitly notes "tutorial system overall is not functioning properly." Without a working tutorial, alpha users get lost. **Promote to P1.** Scope: fix state management, targeting, wait-for-action detection. Visual redesign (BP-084) folds in here. **Prereq for BP-099.** |
| **BP-037** | Clarify Version Management & "Convert to Post" UX | User-confusion bug — people think "Convert to Post" publishes to LinkedIn. This is exactly the kind of friction that kills Free→Paid conversion. Land before any new features. |
| **BP-034** | Past-Due Checker — Direct Publish Button | Scheduled posts that miss their slot have no recovery flow. For a solo creator relying on auto-publish, this is the difference between "the app works" and "the app failed me." |
| **BP-092** | LinkedIn Analytics — Gate UI on Scope Grant | Without this, every Creator/Pro user clicking "Refresh Analytics" gets an error. Hide the UI until the LinkedIn scope lands. |
| **BP-021** | Manual Analytics | Creator+ promised feature; never shipped. Without it, "track your performance" is hollow. Single biggest gap in the Creator value proposition. |
| **BP-085** | AI Usage Monitoring (Admin Portal) | We're providing managed AI access via BP-054. Without cost telemetry, we can't tell if alpha testers are bleeding us dry. Scope down: ship Phase 1 (data capture) + a minimal admin KPI page. Defer the budget enforcement layers. |
| **BP-097** | E2E Test — Free→Pro Happy Path | **Re-scoped.** Was Team-suite E2E. Now: Playwright test covering signup → onboarding → connect LinkedIn → brainstorm → develop into post → schedule → publish → see on calendar → manual analytics entry. This is the regression net for everything else. |
| **BP-099 (NEW)** | Simplified Guided UI Mode (Conversational Assistant) | **Viability multiplier** for less technical users. Toggleable mode that turns the UI into a step-by-step assistant: asks the user what they want to do, walks them through it, asks "what next?" Owner-defined canonical workflow: login → create AI-assisted post → publish or schedule. Reuses Tutorial SDK action-detection primitives. Phased: V1a (Create Post workflow) ships fast; V1b (remaining 5 workflows) follows. **Depends on BP-035** (tutorial engine must be solid first). |

---

### P2 — Free→Pro Polish & Engagement (after viability confirmed)

| BP | Title | Notes |
|---|---|---|
| **BP-036** | Emoji Picker in Post Editor | Small win, high visibility. LinkedIn posts use emojis heavily. |
| **BP-026** | Trending Topics for Brainstorming | Free→Pro brainstorm value-add. AI-only path is cheap; RSS option deferred. |
| **BP-028** | Guided Enhancement Workflows | High-leverage AI feature that differentiates Creator/Pro from "another AI wrapper." Was Low — **promote to P2.** |
| **BP-084** | Tutorial Card Visual Redesign | Confirm whether Tutorial SDK Phase 1 (a882b19) already implements the spec. If not, fold into the BP-035 cleanup. |

---

### P3 — Pro Tier Differentiation (still core, lower urgency)

| BP | Title | Notes |
|---|---|---|
| **BP-027** | Voice Consistency Validation | Pro feature, complements voice profile. |
| **BP-031** | Bulk Operations | Pro power-user feature. |
| **BP-032** | A/B Testing for Hooks | Pro feature, depends on having analytics data flowing (BP-021 or BP-025). |
| **BP-033** | Content Pillar ROI Dashboard | Pro feature, depends on analytics. |

---

### Deferred — Team+ (Feature Flagged, NO Active Work)

All shipped Team work stays in code, hidden behind BP-098's flag. New Team work waits.

| BP | Title | Status |
|---|---|---|
| BP-024 | Multi-User Workspaces | Schema and UI shipped; flag-hidden |
| BP-052 | Brand Consistency Scoring | Team feature, deferred |
| BP-053 | Content Briefs | Team feature, deferred |
| BP-089 | Approval Workflow Status Transitions | Bug exists but only affects Team users; safe behind flag |
| BP-090 | Eliminate `window.location.reload()` | Bug exists in Team-only post editor sections; safe behind flag |
| BP-091 | Approval UX polish | Team-only, deferred |
| BP-093 | Notification Deep-Links + Workspace Badge | Team-only, deferred |
| BP-096 | Approval Deadlines + Reminders | Team-only, deferred |

**Important:** these don't disappear from the backlog. They wait. When Team+ unflags, this list becomes the Sprint 1 cleanup queue.

---

### Deferred — Revenue Infrastructure (until product viable)

| BP | Title | Why deferred |
|---|---|---|
| BP-015 | Stripe Billing Integration | No billing until viability is proven |
| BP-017 | Pricing Page (Stripe Checkout) | Keep the page as informational marketing; strip Checkout calls. Re-add when BP-015 reactivates. |
| BP-045 | Third-Party Ad Integration (Free Tier) | Revenue-side. Defer until Free tier monetization strategy is decided post-validation. |

---

### Blocked

| BP | Title | Block |
|---|---|---|
| BP-025 | LinkedIn API Analytics | LinkedIn app approval pending. Backend + UI built; gated by BP-092 until scope is granted. No action possible. |

---

### Stale / Superseded

| BP | Title | Status |
|---|---|---|
| **BP-030** | Approval Workflows (old) | **Superseded by BP-050** (shipped 2026-04-16). Mark closed. |

---

## Feature Flag Strategy for Team+ (BP-098 in Detail)

The team-collaboration suite is ~3,000 LOC across components, API routes, migrations, helpers, types, and nav items. Hiding all of it requires a layered approach:

### Layer 1: Master Environment Flag
```ts
// src/lib/feature-flags.ts
export const TEAM_FEATURES_ENABLED =
  process.env.NEXT_PUBLIC_TEAM_FEATURES_ENABLED === "true";
```

### Layer 2: Modify `hasFeature()` to short-circuit
```ts
// src/lib/constants.ts (or wherever hasFeature lives)
export function hasFeature(tier: Tier, feature: Feature): boolean {
  // If team features are globally disabled, force-deny any team-tier feature
  if (TEAM_FEATURE_KEYS.includes(feature) && !TEAM_FEATURES_ENABLED) {
    return false;
  }
  return /* existing tier-feature lookup */;
}
```

### Layer 3: Route-level redirect (BP-094)
```ts
// middleware.ts
const TEAM_ROUTES = ["/workspace", "/notifications", "/activity"];
if (TEAM_ROUTES.some(r => pathname.startsWith(r)) && !TEAM_FEATURES_ENABLED) {
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
```

### Layer 4: Hide nav items
```ts
// src/lib/constants.ts NAV_ITEMS
{ href: "/workspace/reviews", label: "Reviews", feature: "workspaces", hideWhenDisabled: true }
```
And in sidebar/mobile-nav, filter on the `hideWhenDisabled` flag.

### Layer 5: Onboarding workspace-type selector
The `/onboarding/type` route lets a Free user pick "Brand/Team" — but Team is flagged off. Either:
- Hide the Brand/Team option entirely when flag is off, OR
- Show it with "Coming soon" badge that disables the click

Recommended: hide entirely. Makes the onboarding linear for Free→Pro users.

### What Stays Visible Even When Flag Is Off
- Database schema and migrations (no rollback — they're inert without the UI)
- API routes (gated to Team-tier users at the auth layer; orphaned when flag off, returning 404 if hit by URL)
- Settings → workspace setup wizard (hide entirely)

### Verification Checklist for BP-098
- [ ] Sidebar shows: Dashboard, Ideas, Posts, Calendar, Analytics, Settings (no Activity, Reviews, Notifications)
- [ ] Mobile nav matches sidebar
- [ ] Top bar: no notifications bell when flag off
- [ ] Post editor: no Comments/Activity tabs, no assignment card, no approval controls
- [ ] Onboarding: only "Individual Creator" option (or auto-skip workspace type)
- [ ] URL `/workspace/reviews` redirects to `/dashboard`
- [ ] URL `/notifications` redirects to `/dashboard`
- [ ] No 500 errors in any flag-off code path
- [ ] Free, Creator, Pro tier users can complete the full create→publish loop without encountering Team UI

---

## Recommended Sprint Plan

### Sprint 1 — Foundation (Week of 2026-04-17, ~4 days)
- **BP-098** Team Features Master Feature Flag
- **BP-094** Route-level tier gating (folded into BP-098 work)
- **BP-018** Feature Gating Logic formalization
- **BP-088** Auth audit — Free/Pro endpoints only (DELETE assign, comments PATCH if reachable by Free/Pro)
- **BP-095** Kill silent failures

### Sprint 2 — Viability Critical Bugs (Week of 2026-04-21, ~5 days)
- **BP-035** Guided Tutorial functional cleanup
- **BP-037** Version mgmt / Convert to Post UX
- **BP-034** Past-Due direct publish button
- **BP-092** LinkedIn analytics UI gating

### Sprint 3 — Creator Value (Week of 2026-04-28, ~5 days)
- **BP-021** Manual Analytics
- **BP-085** AI Usage Monitoring Phase 1 + minimal admin KPI page
- **BP-097** Free→Pro happy-path E2E test

### Sprint 3.5 — Guided UI V1a (Week of 2026-05-05, ~3-5 days)
- **BP-099 (V1a)** Simplified Guided UI Mode — canonical "Create AI-assisted post" workflow only. Ship to a small group of less technical alpha testers and gather feedback before expanding to the other 5 workflows.

### Sprint 4 — Polish + Guided UI V1b (Week of 2026-05-12, ~5-7 days)
- **BP-036** Emoji Picker
- **BP-028** Guided Enhancement Workflows
- **BP-026** Trending Topics (AI-only path)
- **BP-099 (V1b)** Remaining 5 guided workflows (Brainstorm, Develop existing idea, Schedule existing draft, Set up profile, Connect LinkedIn)

After Sprint 4 → **Pause for alpha/beta user feedback.** Decide whether to proceed with Pro-tier P3 items, unflag Team+, or pivot based on feedback.

---

## Strategic Observations

### S1. The Team-features inventory is a sunk cost — treat it that way
~3,000 LOC sits flag-hidden. The temptation will be to "just unflag it" before the right time. Resist. Until a Free→Pro user reports they want collaboration, that code stays dark. The cost of maintaining it (RLS audits, refactors, type drift) is real but bounded.

### S2. Onboarding becomes the most important user surface
With Team paths hidden, every new signup walks through the same flow: Individual Creator → connect LinkedIn → first idea → first post → first publish. If that flow has friction, the product fails. **BP-035 (tutorial cleanup) is now the single most important pre-shipped item.**

### S3. Managed AI access is the alpha-testing oxygen
BP-054 grants 14-day managed AI to new accounts. This is what lets you onboard testers without forcing them to set up API keys. BP-085 (cost telemetry) is the safety net. These two together are the alpha-testing infrastructure — protect them.

### S4. "Pricing page" without billing is a credibility statement
Keep the pricing page as a public marketing page (already shipped per BP-017's earlier work). Strip Stripe Checkout. Add "Coming soon: paid tiers" or "Currently in alpha — all features free during testing." This is honest and sets expectations.

### S5. Validate, don't predict
The original ROADMAP assumed a clear Phase 1 → Phase T1 → revenue flow. Reality: we shipped Team features before validating Creator value. The new sequence — validate Free→Pro through real user feedback BEFORE adding more features — is more disciplined and less risky.

---

## Backlog Changes Made by This Reprioritization

The following items had their **Priority** field updated in BACKLOG.md (preserving Source/Date Added/Description):

| BP | Old Priority | New Priority | Rationale |
|---|---|---|---|
| BP-015 | Critical | **Deferred** | Billing on hold per pivot |
| BP-017 | High | **Deferred** | Pricing page kept as marketing-only; Checkout deferred |
| BP-018 | High | **P0 / Critical** | Foundational for feature-flag strategy |
| BP-021 | Medium | **P1 / High** | Creator-tier value gap |
| BP-024 | High | **Deferred (Team)** | Behind BP-098 flag |
| BP-026 | Medium | **P2 / Medium** | Free→Pro brainstorm value-add |
| BP-027 | Low | **P3 / Low** | Pro tier, no urgency |
| BP-028 | Low | **P2 / Medium** | High-leverage AI feature |
| BP-030 | Medium | **Superseded** | Replaced by shipped BP-050 |
| BP-031 | Low | **P3 / Low** | Pro tier, defer until validation |
| BP-032 | Low | **P3 / Low** | Pro tier, depends on analytics |
| BP-033 | Low | **P3 / Low** | Pro tier, depends on analytics |
| BP-034 | Medium | **P1 / High** | Solo-creator publish reliability |
| BP-035 | High | **P1 / Critical** | Tutorial broken; viability blocker |
| BP-036 | Medium | **P2 / Medium** | Polish, ship quick |
| BP-037 | High | **P1 / High** | UX confusion blocks Free→Paid |
| BP-045 | Medium | **Deferred (Revenue)** | Awaiting monetization decision |
| BP-052 | Medium | **Deferred (Team)** | Behind BP-098 flag |
| BP-053 | Medium | **Deferred (Team)** | Behind BP-098 flag |
| BP-084 | High | **P2 / Medium** | Possibly already addressed by Tutorial SDK Phase 1 |
| BP-085 | High | **P1 / High** | Cost telemetry for managed AI |
| BP-088 | Critical | **P0 / Critical (scoped to Free/Pro)** | Defer Team-only endpoints |
| BP-089 | Critical | **Deferred (Team)** | Team-only bug, safe behind flag |
| BP-090 | Critical | **Deferred (Team)** | Team-only bug, safe behind flag |
| BP-091 | High | **Deferred (Team)** | Team-only |
| BP-092 | High | **P1 / High** | Affects Creator/Pro users today |
| BP-093 | High | **Deferred (Team)** | Team-only |
| BP-094 | High | **P0 / Critical** | Folded into BP-098 |
| BP-095 | Medium | **P0 / High** | Foundation for alpha observability |
| BP-096 | Medium | **Deferred (Team — Phase T4)** | Was already deferred |
| BP-097 | High | **P1 / High (re-scoped to Free→Pro)** | Refocused on solo creator path |
| **BP-098 (NEW)** | — | **P0 / Critical** | Master Team-features feature flag |
| **BP-099 (NEW)** | — | **P1 / High** | Simplified Guided UI Mode for less technical users — viability multiplier (added 2026-04-16 after reprioritization, recovering an uncaptured owner idea) |

---

## TL;DR for the Owner

1. **Forget billing for now.** Stripe (BP-015), Checkout (BP-017), Ads (BP-045) are off the table.
2. **Lock down what's shipped.** BP-098 hides all Team work behind a single flag (~1-2 days work). Then we can safely focus on Free→Pro.
3. **Fix the four things that block solo creators today:** Tutorial (BP-035), Convert-to-Post UX (BP-037), past-due publish (BP-034), LinkedIn analytics gating (BP-092).
4. **Ship the Creator-tier value:** Manual analytics (BP-021).
5. **Watch our spend:** AI usage monitoring (BP-085) Phase 1.
6. **Prove the loop works:** E2E test of the full Free→Pro happy path (BP-097).
7. **Then pause and listen to users.**

Total to viable Free→Pro product: **~4 weeks of focused work** (Sprints 1-4 above), not counting alpha-feedback iteration.

---

*Companion document to the 48-hour system review. Both reports inform the next sprint planning.*
