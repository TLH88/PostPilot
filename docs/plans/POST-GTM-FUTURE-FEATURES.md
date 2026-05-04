# PostPilot — Post-GTM Future Features

> Created 2026-05-04. **The parking lot for features that have been scoped, designed, or pitched — but explicitly deferred to keep the GTM critical path lean.** Do NOT delete the design docs they reference. The point is to preserve all the thinking for the day we have product-market fit and revenue, then pull entries from this list with full context already in place.

## Standing rule (owner direction, 2026-05-04)

Any time a new feature is being scoped and the system determines either:

1. **Low ROI relative to GTM** — the work doesn't move the Free→Pro conversion needle in a measurable way, OR
2. **GTM delay risk** — the work, if greenlit, would push GTM out by more than a sprint

…the system **must** proactively suggest capturing all relevant data (design doc, owner decisions in-flight, effort estimate, dependencies, expected ROI) and adding the entry here. Don't silently abandon. Don't dilute the GTM sprint. Park it cleanly so it's pickable later with zero re-discovery cost.

The trigger is observational, not adversarial — features added here aren't bad ideas, they're just not GTM-critical. Many will ship in the post-launch arc.

## Entry template

Each entry below carries:
- **BP** — original backlog ID (kept stable for traceability)
- **Status when deferred** — e.g. "Design doc done, awaiting owner decisions"
- **Why deferred** — short reason in owner's own words where possible
- **Design doc** — link to the existing artifact (preserve in-place; don't move the file)
- **Owner decisions still needed** — copied verbatim from the source doc
- **Original effort estimate** — for revival sizing
- **Dependencies** — other BPs / infra that must land before this one is viable
- **Expected ROI / revival trigger** — when does revisiting make sense? (Hit X paying users, observe Y signal, post-GTM milestone, etc.)

---

## Index

| BP | Title | Deferred | Revival trigger |
|----|-------|----------|-----------------|
| **BP-140** | Personal Reference Photos for AI Image Generation | 2026-05-04 | Post-GTM, after BP-117 quotas + BP-125 image-gen BYOK ship and Pro tier has measurable demand |

---

## BP-140 — Personal Reference Photos for AI Image Generation

**Status when deferred:** Design doc complete + 5 owner-decision questions pending answers.

**Why deferred (owner, 2026-05-04):** *"Ref image capability is too far out of scope."* Out of the GTM critical path; would consume sprint capacity better spent on pricing foundation (BP-123 → BP-117 → BP-116 → Stripe).

**Design doc:** [docs/plans/bp-140-personal-image-references.md](bp-140-personal-image-references.md) — preserved in place. Includes provider analysis (gpt-image-1 + Fal.ai Flux + IP-Adapter), Storage bucket plan (`user-references`), draft ToS language, three-phase implementation plan, cost analysis ($0.17 per generation worst-case), and consent-modal copy.

**Owner decisions still needed (verbatim from source doc, will be revisited at revival):**

1. Tier gating — Pro-only for Phase 1, or include a Personal-tier allowance (e.g. 10/month)?
2. Legal review of ToS language before shipping — yes (one-hour lawyer review) or no (use draft as-is)?
3. "Use my reference photo" toggle default — Off (explicit opt-in per generation) or On for users who have uploaded a photo?
4. Phase-1 monthly quota cap — 50/month (spec recommendation) or 20/month (tighter ceiling)?
5. Phase 2 scope — primary-photo-only or include multi-photo selection?

**Original effort estimate:** L–XL total across 3 phases; Phase 1 alone is M (1-2 sprints). Spec author recommendation was 50/month quota and Phase 2 primary-photo-only.

**Dependencies:**
- **BP-117** Feature gates (gates the per-tier quota enforcement)
- **BP-125** Pro-tier image-generation BYOK (the BYOK path users would upgrade into)
- **BP-123** Token cost study (informs the final monthly cap)

**Expected ROI / revival trigger:** Post-GTM, once paying-Pro user count justifies the differentiator investment. The pitch — "posts that look like you" — moves PostPilot from generic AI tool to personal-brand companion. Best timed alongside a marketing push focused on personal brand creators after launch traction is established.

**UF traceability:** Originated from UF-006 (test-user feedback cycle 1, 2026-04-26). UF-006 status updated to **Deferred (post-GTM, 2026-05-04)** with link to this entry.
