# BP-119 Phase 1 — Ad Placement Evaluation (Free & Personal Tiers)

> **Status:** Draft v1, 2026-04-24. Phase 1 deliverable — strategy memo only. Phase 2 (ad-network integration + placement build-out) is NOT in scope here.
> **Owner decision required before Phase 2 kicks off.** See "Decisions needed from owner" at the bottom.
> **Assumed context:** Subscription Model v2 shipped 2026-04-24 (BP-115 family). Free = system keys + strict quotas + "full" ads allowed. Personal ($20/mo) = system keys + "limited non-intrusive" ads, **never** in the post editor or during an AI call. Pro ($50) and Team ($100+$6/user) = no ads, ever.

---

## TL;DR

- **Recommended network: hybrid — in-house "Upgrade to Personal/Pro" slots in prime positions + Ethical Ads (fallback: Google AdSense) in secondary slots.** Carbon Ads is a misfit for our LinkedIn-creator audience. AdSense alone trades away too much brand safety for too little RPM.
- **Ad revenue is a rounding error at our current scale.** Realistic revenue at 1,000 Free users on a hybrid stack is **~$40–$110/month**. The point of Free-tier ads is **upgrade pressure and covering a slice of per-user AI cost (~$0.06–$0.24/user/mo)**, not to build an ad business.
- **Personal-tier ads should be deliberately under-monetized.** Two placements max: a sparse settings-page sidebar and login/signup. Anything more risks the Free→Personal upgrade story ("pay $20 to get rid of ads").
- **Phase 2 ship list (proposed, 5 placements):** (1) Free dashboard banner-between-sections, (2) Free footer site-wide, (3) Free interstitial on first-save-of-the-month, (4) Personal settings sidebar, (5) shared login/signup upsell card. Everything else defers to Phase 3 after we have 90 days of conversion data.
- **Hard-ruled out forever:** Sponsored suggestions inside AI output, anything in the post editor, anything during an AI-generation flow, any re-marketing pixel that trades user data for ad dollars.

---

## 1. Ad network options

### Google AdSense
- **Pros:** Highest fill rate (~99% globally), trivial to integrate (`<script>` + slot IDs), self-service auto-approval for a live site, pays net-30 via ACH, no minimum inventory commitment.
- **Cons:** Lowest quality bar in the set. Crypto, dropshipping, "make $10K/mo from home," and weight-loss creatives all clear AdSense's filters regularly. RPM for a US-weighted productivity/SaaS audience is **~$2–$6** — credible but not differentiated. Auto-ads will place aggressively unless we manually define slots. Third-party cookies and re-marketing are default-on (switchable off).
- **Fit for LinkedIn creators:** Mediocre. Our audience is exactly the demo advertisers want (US professionals, 25–55, high-intent SaaS buyers), so we should see the upper half of the RPM range — but the creatives our users see will frequently be off-brand enough to cheapen the product.
- **Verdict:** Keep as the **fallback remnant network** to fill inventory that Ethical Ads can't. Do not make it the primary.

### Carbon Ads
- **Pros:** Curated, single-creative-per-page, no tracking, strong design sensibility, premium RPMs (**~$3–$8** reported, sometimes higher). Publisher brand stays intact.
- **Cons:** Carbon's entire inventory is pitched at **developers** — IDEs, dev tools, hosting, npm packages. That is not our audience. A Carbon ad for a Node.js logging service on a LinkedIn-creator dashboard is a non-sequitur. Publisher approval is also selective; they may simply decline a LinkedIn tool.
- **Fit for LinkedIn creators:** **Poor.** The inventory mismatch alone disqualifies it.
- **Verdict:** **Reject.** Flag for reconsideration only if Carbon ever launches a "creator/marketing" publisher vertical.

### Ethical Ads (readthedocs.org) / BuySellAds
- **Pros:** Curated inventory, no third-party cookies, no tracking pixels, no re-marketing — aligns perfectly with our "Security First" and "no data sold" posture. Ethical Ads RPM is typically **$1–$4** on SaaS-creator inventory; BuySellAds runs higher (**$3–$10**) but is more selective. Both serve static image + text creatives only — no video, no autoplay, no interstitials.
- **Cons:** **Smaller inventory pool** means fill rate is not 100%. Approval required (not instant). Minimum monthly impression thresholds on some BSA zones. Payouts net-60 (BSA) / net-30 (Ethical Ads).
- **Fit for LinkedIn creators:** **Good.** Both networks carry SaaS and marketing-tool inventory that makes sense next to a LinkedIn post builder. Creatives are always static and won't animate over the UI.
- **Verdict:** **Primary choice.** Start with Ethical Ads (lower approval bar, faster turnaround). Promote to BSA once we have 50K+ monthly impressions to meet their minimums.

### In-house "Upgrade to Personal/Pro" promotional slots
- **Pros:** Zero external revenue, but **100% brand-safe, 100% on-message, 100% aligned with our own funnel.** Every impression is an upgrade nudge. No approval process, no creative review, no payout delay. Fill rate is by definition 100%.
- **Cons:** No cash revenue from external advertisers. Requires us to design/maintain creative variants ourselves. Conversion copy fatigue if the same creative runs everywhere.
- **Fit:** Excellent for any slot that is high-visibility but also high-conversion-sensitivity — places where a bad external creative would cost us an upgrade.
- **Verdict:** **Use this in every prime slot** (dashboard, post-save interstitial, login) where an external ad would risk more upgrade harm than it would earn in RPM.

### Hybrid (in-house primary + external remnant)
- **Mechanic:** Every ad slot has a priority waterfall. First try the in-house upgrade creative. If we've already shown it to this user N times this week (frequency cap), or if the user is Personal-tier (upgrade CTA points to Pro instead of "dismiss"), fall through to Ethical Ads. Final fallback = AdSense remnant.
- **Verdict:** **Recommended.** Best of both — we capture upgrade conversions we'd otherwise leak, and we monetize the long tail of sessions where the user has seen our upgrade pitch enough times.

**Recommendation:** Hybrid stack — in-house upsell as the primary creative in every slot, Ethical Ads as the external default, AdSense as the remnant fill. Skip Carbon. Skip BuySellAds until we hit their impression minimum.

---

## 2. Ad format matrix

| Format | Accept? | Where | Notes |
|---|---|---|---|
| **Banner (static)** | Yes | Free + Personal | Standard 728×90 or 300×250 static image. Our default. |
| **Banner (rotating/animated)** | No | — | Any motion in a writing app steals attention from the user's work. Hard no. |
| **Native / in-content cards** | Yes, **only outside the editor** | Free dashboard, Posts list | Styled to look like our UI but labeled "Sponsored." Never inside a rendered post preview. |
| **Side-panel** | Yes | Free: settings/library. Personal: settings only | Low visibility but unobtrusive. Good for remnant fill. |
| **Interstitial (modal after action)** | Yes, Free only, rate-limited | Free: post-save once/month | Max once per user per calendar month. Must be dismissible in ≤1 click. Never during AI generation. |
| **Sponsored suggestions in AI output** | **NEVER** | — | Would inject advertiser content into what the user is about to publish as their own LinkedIn post. Ethically disqualifying. Also violates LinkedIn's TOS on paid content disclosure. Also destroys user trust in our AI. This is the hard line. |
| **Autoplay video / audio** | No | — | Writing app. Hard no. |
| **Sticky / scroll-locked** | No | — | Hurts mobile UX more than the RPM lift justifies. |
| **Re-marketing pixels** | No | — | Violates "Security First" posture. No user-data-for-ad-dollars trade. |

---

## 3. Placement catalogue per tier

Scoring key:
- **Visibility** 1 (rarely seen) → 5 (every session)
- **Intrusiveness** 1 (ignorable) → 5 (blocks the user)
- **Conversion-harm risk:** L/M/H — how much this placement hurts upgrade rates
- **Expected RPM:** rough $/1,000 impressions on Ethical-Ads-grade inventory

### Free tier

| # | Placement | Visibility | Intrusiveness | Conv-harm | RPM est. |
|---|---|---|---|---|---|
| F1 | Banner above dashboard (top of `/dashboard`) | 5 | 3 | M | $2–$4 |
| F2 | Site-wide footer of every app page | 4 | 1 | L | $0.50–$1.50 |
| F3 | Native card between Recent Drafts and Recent Ideas | 4 | 2 | L-M | $2–$5 |
| F4 | Native card between posts in Posts list | 3 | 2 | L | $1.50–$3 |
| F5 | Empty-state area (empty library, empty drafts) | 2 | 1 | L | $1–$2 |
| F6 | Side-panel on Settings | 2 | 1 | L | $0.50–$1.50 |
| F7 | Side-panel on Library | 2 | 1 | L | $0.50–$1.50 |
| F8 | Interstitial on **first save of the month** | 3 (1×/mo) | 5 | **H** | $4–$8 (CPM of one high-attention impression) |
| F9 | Login page | 3 | 1 | L | $1–$2 |
| F10 | Signup page | 2 | 1 | L | $1–$2 |

### Personal tier (hard-limited)

| # | Placement | Visibility | Intrusiveness | Conv-harm (to Pro) | RPM est. |
|---|---|---|---|---|---|
| P1 | Sparse site-wide footer (text-only or single 728×90) | 4 | 1 | L | $0.50–$1.50 |
| P2 | Settings page sidebar | 2 | 1 | L | $0.50–$1.50 |
| P3 | Login/signup page (shared w/ Free) | 3 | 1 | L | $1–$2 |
| P4 | Empty-state CTAs | 2 | 1 | L | in-house only |

**Hard rules for Personal:**
- Never in the post editor (`/posts/[id]`)
- Never on the post composer / new-post flow
- Never during or adjacent to an AI-generation call (brainstorm, enhance, hashtags, hook, chat, image gen)
- Never in the Library page body content (footer only if anywhere)
- Never an interstitial

### Pro and Team tier

**No ads, ever.** Not even in-house upsells. The whole point of Pro/Team is a clean workspace. This is a hard product constraint, not a placement to score. Enforcement = server-side tier check on the ad-rendering component; no ad SDK loads at all for Pro/Team sessions.

---

## 4. Conversion-impact risk

The relevant funnel questions:
- **Free → Personal:** does this placement make users upgrade *to escape ads*, or does it make them bounce to Buffer/Taplio instead?
- **Personal → Pro:** does ad presence on Personal push users up the ladder, or does it train them that "ads are fine, $20 is enough"?

### Highest-risk placements (watch carefully, A/B test)

- **F8 — First-save-of-month interstitial.** Biggest RPM per impression AND biggest risk. Users just completed a successful, high-emotional-reward action (saved their post); interrupting that moment with an external ad risks souring the app experience. **Mitigation:** make it in-house upsell 100% of the time for the first 90 days. Only swap in external creatives after we know the click-through pattern. And never for a Free user who has saved <5 posts total — they haven't earned the right to an interstitial yet.
- **F1 — Dashboard top banner.** Most-seen slot in the app. An off-brand creative here cheapens every session. **Mitigation:** in-house upsell primary, Ethical Ads only (not AdSense) as fallback, strict brand-safety filters.
- **F3 — Between Recent Drafts and Recent Ideas.** Native placement right in the "I'm actively working" zone. If users perceive this as cluttering their workspace, they bounce. **Mitigation:** native styling + clear "Sponsored" label + dismissible once per session.

### Medium-risk placements

- **F4 — Posts list interstitial/native card.** Users scrolling their own content history. Native card is OK; a full interstitial is too much.
- **P1 — Personal footer.** The *only* substantive Personal ad slot. Must stay small and static. If this grows, the "upgrade to get rid of ads" pitch for Pro dies.

### Low-risk placements (just ship them)

- **F2 / F6 / F7 / F9 / F10 / P2 / P3 / P4** — footers, sidebars, empty states, auth pages. All low-visibility or low-intrusiveness. Worst case they produce no revenue; best case they're steady filler.

### Personal → Pro cannibalization risk

Every ad on Personal is a small argument *against* upgrading to Pro. If Personal is "$20 and a tiny footer ad" and Pro is "$50 and no ads," the ad delta is worth roughly $30/mo in user perception — which it isn't. The Personal ad experience has to be **almost invisible**, or we're training users that $20 is the ceiling. Keep Personal placements to **2 max** in Phase 2 (footer + settings sidebar).

---

## 5. Revenue projection

### Assumptions
- RPM blended across placements: **$2.00** (Ethical Ads primary, AdSense remnant). In-house slots contribute $0 revenue but contribute ~1–3% upgrade-rate lift (modeled separately, not in this number).
- **Free user impressions/month:** ~80 page views, ~3 ad slots/page average = **~240 ad impressions/Free user/month**. Impression = 1 rendered ad slot.
- **Personal user impressions/month:** ~150 page views (higher engagement), ~1 ad slot/page (footer only most of the time) = **~150 ad impressions/Personal user/month**.
- Fill rate: 85% (Ethical Ads ~70% + AdSense remnant picking up the rest, minus ~15% dropped to in-house/no-fill).

### Free-tier scenarios

| Free users | Imps/mo | Filled imps | Rev @ $2 RPM | Rev @ $1 low | Rev @ $4 high |
|---|---|---|---|---|---|
| 100 | 24,000 | 20,400 | **$41** | $20 | $82 |
| 500 | 120,000 | 102,000 | **$204** | $102 | $408 |
| 1,000 | 240,000 | 204,000 | **$408** | $204 | $816 |

### Personal-tier scenarios

| Personal users | Imps/mo | Filled imps | Rev @ $1.50 RPM | Rev @ $0.50 low | Rev @ $2.50 high |
|---|---|---|---|---|---|
| 50 | 7,500 | 6,375 | **$10** | $3 | $16 |
| 200 | 30,000 | 25,500 | **$38** | $13 | $64 |
| 500 | 75,000 | 63,750 | **$96** | $32 | $159 |

### Cost-offset framing

Per the 2026-04 token cost study, a Free user costs us **~$0.06–$0.24/mo** in AI. At 1,000 Free users, that's **$60–$240/mo in AI cost**. Mid-scenario ad revenue ($408) more than covers worst-case Free AI cost and contributes a little. **This is the actual business case for Free-tier ads: subsidize the AI cost of running a free tier, so we can keep the free tier generous without it becoming a permanent drag on Pro-user-funded infra.**

Personal at 200 users (realistic near-term) generates **~$38/mo in ad revenue** against **~$4,000 MRR**. Ad revenue is <1% of Personal MRR. **Don't let Personal ads distort product decisions.** The whole point of Personal ads is to keep the "upgrade to Pro and we remove even the tiny footer ad" story intact, not to book meaningful revenue.

### Sensitivity

- If we end up with AdSense-dominated inventory (Ethical Ads rejects us), blended RPM drops to ~$1.20 and these numbers scale by 0.6×.
- If we land both Ethical Ads *and* get accepted to BuySellAds for premium zones, blended RPM could hit $3.50+ and numbers scale by 1.75×.
- Image-heavy ad creatives perform ~1.4× text-only on clickthrough but ~0.7× on user sentiment. We should default to text-heavy creatives.

---

## 6. Ethical constraints (hard rules)

These are non-negotiable. Written to BP-119's spec and PostPilot's "Security First" posture.

1. **No ads inside AI-generated content.** Ever. No sponsored lines injected into drafts, no sponsored hashtags, no sponsored hook suggestions. The AI output is the user's voice, not advertiser inventory.
2. **No ads that could be mistaken for the user's own LinkedIn posts.** Native cards must have an unambiguous "Sponsored" label and be visually distinct from our own post previews.
3. **No ads in the post editor.** The `/posts/[id]` and new-post pages are always ad-free for all tiers including Free. Writing is a concentration task; interrupting it costs us more in churn than any RPM lift.
4. **No ads during AI generation.** No ads render while an AI route (brainstorm, enhance, hashtags, analyze-hook, chat, image-gen) is in-flight or for 5 seconds after completion. Users should associate the AI with us, not with a third-party creative that happened to render at the same moment.
5. **No re-marketing pixels, no third-party cookies for ad targeting, no data sharing with networks beyond page URL and coarse geolocation.** This rules out AdSense's default auto-ads configuration — we must manually disable personalized ads in the AdSense dashboard before going live.
6. **No auto-play video or audio.** Static images and text only.
7. **No sticky / scroll-locked ads on mobile.** Mobile experience stays clean.
8. **Max one ad slot per above-the-fold viewport.** Never two ads visible without scrolling.
9. **Frequency cap on interstitials: 1 per user per calendar month, dismissible in ≤1 click, never within 48 hours of signup.** New users get an ad-free honeymoon.
10. **Pro and Team sessions load zero ad SDK.** Tier check happens server-side before the ad component mounts. This is enforcement, not trust.

---

## 7. Phase 2 scope proposal — 5 placements to ship first

Picked for highest-expected-revenue × lowest-conversion-harm, weighted toward learning. Each ships behind a feature flag so we can kill it if metrics go the wrong way.

### Phase 2 ship list

1. **F2 — Site-wide footer ad (Free only).** Lowest-risk placement in the catalogue. Gets us operational experience with the ad network, creative QA, brand-safety filters, and fill-rate monitoring before we ship anything more visible. Expected revenue: small. Expected learning: large.
2. **F1 — Dashboard top banner (Free only).** Highest-visibility slot with a manageable risk profile. Run in-house upsell primary + Ethical Ads fallback. This is our main Free-tier RPM driver.
3. **F8 — First-save-of-the-month interstitial (Free only).** Highest per-impression value, but shipped in-house-upsell-only for Phase 2. Swap in external creatives only in Phase 3 after we have 90 days of save-rate baseline data to compare against.
4. **P2 — Personal settings page sidebar.** Only substantive Personal placement. Keeps Personal ads honestly "limited." Low conversion risk because settings is already a low-engagement page.
5. **Shared login/signup upgrade card (F9/F10/P3).** In-house only. Not revenue; conversion-funnel optimization. Frames signup around the paid tiers so new users anchor on value, not on "Free is enough."

### Explicitly deferred to Phase 3

- F3 (between-section native card) — ship only after F1/F2 data shows Free users are tolerating ads.
- F4 (Posts list native cards)
- F5/F6/F7 (empty states, library/settings sidebars for Free)
- P1 (Personal footer) — defer until we know whether Personal users are actually upgrading to Pro or bouncing. If Free→Personal→Pro ladder works, P1 stays permanently deferred. If users are stalling on Personal, P1 becomes the lever.

### Phase 2 metrics to wire up before launch

- Ad impression count per placement per tier (BP-085 logging pattern)
- Ad click-through rate per placement
- Free-user 30-day retention: with ads vs pre-ads cohort
- Free → Personal conversion rate: with ads vs pre-ads cohort
- Ad network fill rate + RPM, weekly
- User-reported ad quality issues (Settings → "Report ad" link required)

---

## Decisions needed from owner

Before Phase 2 engineering can begin, please decide:

1. **Ad network stack.** Approve: Ethical Ads primary + AdSense remnant + in-house upsell waterfall. (Reject Carbon Ads. Defer BuySellAds.) Y/N?
2. **Phase 2 placement ship list.** Approve the 5-placement list in §7 (F1, F2, F8, P2, login/signup upsell card)? Or trim/adjust?
3. **Frequency cap on F8 interstitial.** Spec says 1× per calendar month, never in first 48h of signup. Acceptable, or should the cap be stricter (e.g., 1× per 90 days for users in their first quarter)?
4. **Personal-tier ad floor.** Are we willing to ship Personal with **only** the settings sidebar (P2) + shared login card (P3) for Phase 2, and defer the footer (P1)? Or do you want the footer in too for symmetry with the messaging?
5. **In-house creative ownership.** Who designs the Upgrade-to-Personal / Upgrade-to-Pro creatives? (Options: Tony writes copy + generates images with gpt-image-1; contracted designer; or we ship text-only Tailwind cards for Phase 2 and add visuals in Phase 3.)
6. **AdSense personalized-ads setting.** Confirm we disable personalized/re-marketing ads in AdSense before go-live, even at a revenue cost. (§6 rule 5 assumes yes.)
7. **Kill-switch criteria.** What metric threshold triggers us pulling all Free-tier ads? Proposed: Free 30-day retention drops >5 pp vs pre-ads baseline, OR Free→Personal conversion drops >2 pp, sustained over 2 consecutive weeks. Agree, or tighten?
8. **Timing relative to Stripe.** Phase 2 only makes sense if there's *something to upgrade to*. Should Phase 2 build wait until BP-015 (Stripe) is shipped, or ship the ad slots ad-free-externally with in-house upsell only in the meantime? Recommendation: **wait for Stripe.** Revisit.

---

*Memo prepared for BP-119 Phase 1. Phase 2 (integration + build) opens once the owner signs off on the decisions above.*
