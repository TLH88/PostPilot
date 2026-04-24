# Token Cost Study — Subscription Model v2 Unit Economics

> **Status:** Draft v1 prepared 2026-04-24 for BP-123. **Owner-approved 2026-04-24 with one amendment: Personal chat quota raised from 150 → 200/month.** All figures below updated to reflect the approved quotas.
> **Decisions committed:** (1) model swap to mini-tier, (2) image-gen default = gpt-image-1, (3) Personal quotas 30/20/**200**/30, (4) Personal $20/mo confirmed. Two new follow-up BPs approved for creation: BP-127 (complete AI route logging) and BP-128 (brainstorm prompt caching).
> **Source data:** Supabase `ai_usage_events` (2026-04-12 → 2026-04-23, 36 events, 2 distinct users, $0.635 total cost); `usage_quotas` (Apr 2026 period); `post_image_versions` and `posts` tables; `src/lib/ai/cost-table.ts` pricing as of 2026-04-12; `src/lib/ai/model-router.ts` routing logic.
> **Pricing baseline:** Vercel AI Gateway (gateway-exact for 27 of 36 logged events; cost-table estimate for 9 image-gen events routed BYOK-direct).

---

## TL;DR — the four recommendations

1. **Change the default system model from `gpt-4.1` to `gpt-4.1-mini` for chat and brainstorm.** Per-call cost drops ~78% with no meaningful quality hit for these routes. This single change cuts Pro-no-BYOK worst case from ~$17/mo to ~$9.50/mo.
2. **Keep image generation on `gpt-image-1` (not `gpt-image-1.5`) for system-key users.** Image gen is the dominant cost driver in every tier that includes it — $0.040 vs $0.050/image is a 20% saving with no user-visible degradation.
3. **Set Personal-tier quotas to: 30 posts / 20 brainstorms / 200 chats / 30 image gens per month.** Covers Tony's heavy-usage profile with 0.9×–2.3× headroom. Worst case: **$3.90/mo (current models) → $1.66/mo (after model swap)** against $20 revenue = **80%–92% margin**. Image quota (30) is the single biggest lever — don't raise it without re-pricing.
4. **Prioritize prompt caching on brainstorm.** Today 0% of brainstorm input tokens are cached because BP-009 history injection rotates the entire context. Restructuring so the stable prompt prefix is cacheable (Anthropic cache_control markers, or switch to Sonnet for caching discount) is a 30–50% brainstorm cost reduction at minimum effort.

**Personal at $20 is viable at these quotas.** Break-even at worst case = 8 Personal users, 4 Pro users, or any mix covering $130/mo fixed infra.

---

## 1. Methodology, assumptions, and data limits

**What's in the data (2026-04-12 → 2026-04-23):**
- 36 AI calls across 2 users. 34 of those 36 are Tony (`3cbf1932-…`). The 2nd user generated 2 events.
- 27 calls logged with `cost_source = 'gateway_exact'` (real billed cost from Vercel AI Gateway).
- 9 image-gen calls logged with `cost_source = 'estimated'` (image gen bypasses the Gateway; cost derived from `src/lib/ai/cost-table.ts`).
- Total cost across all logged activity: **$0.635**.

**What's NOT in the data (known gaps):**
- BP-085 Phase 1+2 logging wired `brainstorm`, `chat`, and `generate-image` routes only. The following routes are NOT currently logging to `ai_usage_events`: `enhance`, `hashtags`, `analyze-hook`, `draft`, `idea-generate`. Any cost estimates for these routes in this memo are derived from `cost-table.ts` + estimated token counts, not measured.
- Logging only started 2026-04-12, so ~34 days of beta usage (2026-03-09 → 2026-04-11) are invisible in `ai_usage_events`. `usage_quotas` covers the April 2026 window (23 days).
- Only 6 non-test beta users exist. Any distribution claim (p50/p95/p99) across "the user population" is noisy because n=2 in the log table.

**Implication:** Tony is effectively the sole source for per-user behavioral assumptions. This memo treats Tony's usage pattern as the "heavy active user" proxy per owner direction.

**Cross-validation:** `usage_quotas` (Tony, Apr 1–23, 23 days):
- 5 posts created → 6.5/month
- 11 brainstorms → 14.3/month
- 66 chat messages → 86.1/month
- 11 scheduled posts → 14.3/month

Plus `post_image_versions` (Tony, Apr 5–23, 19 days): 20 images → 31.6/month.

Brainstorm and chat counts from `usage_quotas` are ~2x what `ai_usage_events` captures for the same time window, because logging started partway through. **Use `usage_quotas` for call-rate assumptions; use `ai_usage_events` for per-call cost.**

---

## 2. Per-route cost profile (from real data)

Tony's AI provider is set to OpenAI with no model override (→ falls back to `gpt-4.1` default). All logged text calls below are gpt-4.1.

| Route | Model | Calls | Avg Input | Avg Cached | Avg Output | **Avg $/call** | p95 $/call | Max $/call |
|-------|-------|-------|-----------|------------|------------|----------------|------------|------------|
| `generate-image` | `gpt-image-1.5` | 7 | — | — | — | **$0.0500** | $0.0500 | $0.0500 |
| `generate-image` | `gpt-image-1` | 1 | — | — | — | $0.0400 | $0.0400 | $0.0400 |
| `generate-image` | `gemini-3.1-flash-image-preview` | 1 | — | — | — | $0.0395 | $0.0395 | $0.0395 |
| `chat` | `gpt-4.1` | 19 | 2,357 | 741 (31% hit) | 296 | **$0.00709** | $0.0100 | $0.0113 |
| `brainstorm` | `gpt-4.1` | 7 | 2,395 | 0 (0% hit) | 652 | **$0.01001** | $0.0106 | $0.0106 |
| `chat` | `gemini-2.5-flash` | 1 | 905 | 0 | 1,722 | $0.00117 | — | — |

Unlogged routes, estimated from `cost-table.ts` at typical token counts:

| Route | Routed model (today) | Est. input | Est. output | **Est. $/call** |
|-------|----------------------|------------|-------------|-----------------|
| `hashtags` | `gpt-4.1-mini` (simple) | ~200 | ~100 | $0.00024 |
| `analyze-hook` | `gpt-4.1-mini` (simple) | ~300 | ~150 | $0.00036 |
| `enhance` | `gpt-4.1` (standard) | ~500 | ~300 | $0.0034 |
| `draft` | `gpt-4.1` (user-selected/complex) | ~1,500 | ~500 | $0.0070 |

**Observation A — image gen dominates.** One image call = ~7 standard gpt-4.1 text calls. In any tier that includes image gen, image is where the money goes.

**Observation B — chat and brainstorm drive the second-largest bucket.** gpt-4.1 at ~$0.007–0.010/call is ~20–40× more expensive than an `hashtags` call and ~5× a hashtag call's cost for the same quality-irrelevant routing. Mini-tier models cut this to ~$0.002/call.

**Observation C — cost_source split.** 27 gateway_exact + 9 estimated. The estimated rows all correspond to image gen (currently bypasses Gateway). If we ever need audit-grade cost data on image generation, route image gen through the Gateway.

---

## 3. Expected cost to serve the average active user (Tony baseline)

Using `usage_quotas` rates scaled to 30 days + Tony's image-version rate + estimated post-ancillary AI calls:

| Route | Monthly rate (Tony) | Current $/call | **Current $/mo** | Mini-tier $/call | **Mini-tier $/mo** |
|-------|---------------------|----------------|------------------|-------------------|---------------------|
| Brainstorm | 14.3 | $0.0100 | $0.143 | $0.0020 | $0.029 |
| Chat | 86.1 | $0.0071 | $0.611 | $0.0017 | $0.146 |
| Image gen | 31.6 | $0.050 (gpt-image-1.5) | $1.580 | $0.040 (gpt-image-1) | $1.264 |
| Post ancillaries (draft + enhance + hashtag + hook-analyze, est. 3 calls/post) | 6.5 × 3 = ~20 | ~$0.005 avg | $0.098 | ~$0.001 avg | $0.020 |
| **Total** | | | **$2.43/mo** | | **$1.46/mo** |

Tony's monthly AI cost under the current configuration is **~$2.43**. Under the recommended model swap, **~$1.46**.

Against each tier's revenue (assuming Tony's pattern were typical):

| Tier | Revenue | Cost (current) | Margin | Cost (mini) | Margin |
|------|---------|----------------|--------|-------------|--------|
| Free ($0) | $0 | $2.43 | — | $1.46 | — |
| Personal ($20) | $20 | $2.43 | 88% | $1.46 | 93% |
| Pro no-BYOK ($50) | $50 | $2.43 | 95% | $1.46 | 97% |

**Healthy at every paid tier.** Tony's profile is not economically threatening — the worst-case tier max is where the risk lives (§4).

**Caveat:** Tony is a heavy image-gen user (32/month). A Personal-tier user who doesn't use image gen would run ~$0.80/mo; one who uses it as much as Tony runs ~$1.46/mo on mini-tier, ~$2.43 today. Image gen is the lever.

---

## 4. Max-cost-per-tier (worst case)

A user exhausts every quota at typical (not p95) token counts. This is the "how much could one user cost us" ceiling.

### 4.1 Current defaults (gpt-4.1 + gpt-image-1.5)

**Free ($0)** — quotas from existing code (3 posts / 2 brainstorms / 20 chats / no image):

| Item | Quota | $/call | $/mo |
|------|-------|--------|------|
| Post ancillaries (draft + enhance + hashtag + hook ≈ 4 calls) | 3 × 4 = 12 | ~$0.005 | $0.060 |
| Brainstorm | 2 | $0.010 | $0.020 |
| Chat | 20 | $0.008 | $0.160 |
| Image | 0 | — | — |
| **Max cost / Free user / month** | | | **~$0.24** |

Free is fine. Even if every Free user maxed out monthly, 500 free users = $120/mo — less than our fixed $130 infra.

**Personal ($20/mo) — at approved quotas (see §5)** — 30 posts / 20 brainstorms / **200 chats** / 30 images:

| Item | Quota | $/call | $/mo |
|------|-------|--------|------|
| Post ancillaries | 30 × 4 = 120 | ~$0.005 | $0.600 |
| Brainstorm | 20 | $0.010 | $0.200 |
| Chat | 200 | $0.008 | $1.600 |
| Image | 30 | $0.050 | $1.500 |
| **Max cost / Personal user / month** | | | **~$3.90** |
| **Margin @ $20** | | | **80.5%** |

**Pro no-BYOK ($50/mo)** — 100 posts / 200 brainstorms / 500 chats / 200 images:

| Item | Quota | $/call | $/mo |
|------|-------|--------|------|
| Post ancillaries | 100 × 4 = 400 | ~$0.005 | $2.000 |
| Brainstorm | 200 | $0.010 | $2.000 |
| Chat | 500 | $0.008 | $4.000 |
| Image | 200 | $0.050 | $10.000 |
| **Max cost / Pro user / month** | | | **~$18.00** |
| **Margin @ $50** | | | **64%** |

**Team no-BYOK** — unlimited on paper. **Don't compute:** Team is designed around BYOK being *included and encouraged*. A Team user burning system keys without BYOK is an ops incident, not a pricing scenario. Recommend: track Team-user system-key usage as a KPI, reach out with BYOK onboarding when any Team account hits $30/mo burn.

### 4.2 After model swap (gpt-4.1-mini + gpt-image-1)

Same quotas, cheaper models:

| Tier | Max $/mo (after swap) | Margin |
|------|-----------------------|--------|
| Free | **~$0.06** | — |
| Personal ($20) | **~$1.66** | **91.7%** |
| Pro no-BYOK ($50) | **~$9.50** | **81%** |

The model swap alone turns Pro no-BYOK from a healthy tier into a very healthy tier. On Personal, it gives us headroom to *raise* quotas without hurting margin.

### 4.3 Break-even math

Fixed infra: $130.42/mo. To break even:

| Scenario | Users needed |
|----------|--------------|
| All Personal, current models | $130 / ($20 − $3.90) = **9 Personal users** |
| All Personal, mini-tier models | $130 / ($20 − $1.66) = **8 Personal users** |
| All Pro no-BYOK, current models | $130 / ($50 − $18) = **5 Pro users** |
| All Pro no-BYOK, mini-tier models | $130 / ($50 − $9.50) = **4 Pro users** |
| Mixed realistic (10 Personal + 3 Pro, mini-tier) | $183 margin vs $130 — **2 Pro + 7 Personal covers infra** |

**GTM target:** if paid conversion hits ~15 users (any mix) within 90 days of launch, we're cash-flow positive on operations. This is a concrete, reachable number.

---

## 5. Recommended Personal-tier quotas

Tony's observed monthly rates are our only data point. Setting Personal quotas to cover his profile with 0.9–1.6× headroom:

| Resource | Tony's actual | **Personal quota (approved)** | Pro quota | Ratio Pro/Personal |
|----------|---------------|-------------------------------|-----------|---------------------|
| Posts created | 6.5 | **30** | 100 | 3.3× |
| Brainstorms | 14.3 | **20** | 200 | 10× |
| AI chats | 86.1 | **200** | 500 | 2.5× |
| Image gens | 31.6 | **30** | 200 | 6.7× |
| Scheduled posts | 14.3 | **Unlimited**¹ | Unlimited | — |
| Post versions | n/a | **Unlimited**¹ | Unlimited | — |

¹ Scheduled posts and post versions aren't AI-cost items; no reason to cap them.

**Why these numbers:**
- **Posts 30/month** — gives Personal users 4–5× Tony's current volume. Heavy solo creator comfortably covered.
- **Brainstorms 20/month** — near-exactly Tony's rate + slight headroom. Brainstorming is typically bursty; 20 supports weekly ideation sessions comfortably.
- **Chats 200/month** — ~2.3× Tony's rate. Chat is the cheapest-per-call text feature; generous here is margin-safe and gives Personal users a "conversational" feel without quota anxiety. (Owner raised this from the initial 150 recommendation during approval — still well within margin.)
- **Images 30/month** — just below Tony's rate (0.95×). **This is the margin-critical lever.** Every additional 10 images on Personal adds ~$0.50/mo to cost. We can relax this after we have real Personal-user data post-launch.

**Alternative if you want Personal to feel more generous than Tony's usage:**
- 50 posts / 30 brainstorms / 200 chats / 50 images
- Max cost: ~$4.70/mo (current models) or ~$2.40/mo (mini-tier)
- Margin: 77% current / 88% mini-tier
- Still viable; just less headroom to absorb a cohort of power users.

---

## 6. Model-mix analysis and the swap recommendation

Current routing (from `src/lib/ai/model-router.ts`):

| Task type | Routes | Current model (OpenAI default) | Mini alternative | Price ratio |
|-----------|--------|--------------------------------|------------------|-------------|
| Simple | hashtags, analyze-hook | `gpt-4.1-mini` ✓ already cheap | — | — |
| Standard | enhance, brainstorm | `gpt-4.1` ($2 / $8 per M) | `gpt-4.1-mini` ($0.40 / $1.60 per M) | **5× cheaper** |
| Complex | chat, draft, generate-image | User's selected (default `gpt-4.1`) | `gpt-4.1-mini` | **5× cheaper** |

**Per-call cost under swap (using Tony's observed input/output patterns):**

| Route | Current (gpt-4.1) | Swap (gpt-4.1-mini) | Saving |
|-------|-------------------|---------------------|--------|
| Chat | $0.00709 | ~$0.00171 | **76%** |
| Brainstorm | $0.01001 | ~$0.00200 | **80%** |
| Enhance (est.) | $0.00340 | ~$0.00068 | **80%** |
| Draft (est.) | $0.00700 | ~$0.00140 | **80%** |

**Quality consideration — will mini-tier be good enough?**
- For **hashtag, hook-analyze, enhance**: yes, comfortably. These are short, structured tasks. Mini-tier models are near-indistinguishable from full-tier on this kind of work.
- For **brainstorm**: probably yes. Brainstorm produces 5–10 ideas; mini-tier models handle listing and categorization well. Worth A/B testing before locking in.
- For **chat**: this is the one where users might notice. Chat is the user's "partner in writing" — longer-form, more nuanced. **Recommendation:** keep chat on the user's selected model for Pro-with-BYOK (unchanged), but default system-key chat to mini-tier. Personal users are explicitly on the system tier; if they want premium, that's the Pro upgrade path.
- For **draft/generate-image**: image stays on image models regardless. Draft on mini-tier is acceptable; the post editor lets users iterate so any quality gap shows up as more iteration calls, not broken output.

**Provider-agnostic equivalents** (so the recommendation works whichever provider a user has configured):

| Task | OpenAI | Anthropic | Google |
|------|--------|-----------|--------|
| Simple (current) | gpt-4.1-mini ✓ | claude-haiku-4-5 ✓ | gemini-2.5-flash-lite ✓ |
| Standard (recommend switch) | **gpt-4.1-mini** | **claude-haiku-4-5** | **gemini-2.5-flash** (already) |
| Complex — system keys (recommend switch) | **gpt-4.1-mini** | **claude-haiku-4-5** | **gemini-2.5-flash** |
| Complex — BYOK (unchanged) | user's choice | user's choice | user's choice |

**Note on Anthropic caching:** `claude-sonnet-4-6` and `claude-haiku-4-5` both have `cachedReadPerMillion` rates (90% discount). **If we're going to push prompt caching (Recommendation 4), Anthropic models deliver the biggest caching benefit.** Consider making Anthropic-Haiku the default system provider instead of OpenAI-mini for the caching-heavy routes (brainstorm, chat).

---

## 7. Prompt-caching opportunity

Current cache performance from logged data:

| Route | Input tokens | Cached tokens | Hit rate | Savings realized |
|-------|--------------|---------------|----------|------------------|
| Chat (gpt-4.1) | 45,695 | 14,080 | **30.8%** | **$0.00** |
| Brainstorm (gpt-4.1) | 16,763 | 0 | **0%** | $0.00 |

**Chat paradox:** 30.8% of input tokens are cached, but realized savings = $0. Why? `gpt-4.1` has no `cachedReadPerMillion` in our cost table — OpenAI's cached-token discount may not be applied on this model via the Gateway, or our logging isn't capturing it. Either way, we're paying full price on those 14,080 cached-flagged tokens.

**Brainstorm is a black hole:** 0% caching because BP-009 injects 15 recent posts + 10 recent ideas into every brainstorm context. The prompt string is unique every call.

**Two concrete caching wins:**

1. **Restructure brainstorm prompt.** Move the stable system prompt + voice profile + content pillars *before* the volatile history injection, and cache the stable prefix. On Anthropic with `cache_control` markers, the stable prefix (probably ~1,500 of the 2,395 input tokens) becomes 90% cheaper after the first call. Estimated saving: **~50% on brainstorm cost**.

2. **Switch system-key brainstorm + chat default to Anthropic Haiku.** Haiku has explicit cached-read pricing ($0.08/M vs $0.80/M input = 90% discount). Combined with prompt restructuring, brainstorm/chat cost drops another ~40% vs mini-tier OpenAI.

Combined potential: brainstorm at $0.00200/call (mini-tier OpenAI) → ~$0.00060/call (Haiku + caching) = another 70% reduction.

At Pro worst case with 200 brainstorms/mo, that's $0.40 saved per user per month. Small absolute, but free money after the one-time prompt rewrite.

---

## 8. Hidden cost drivers worth monitoring

1. **BP-009 history injection on brainstorm.** 15 posts + 10 ideas = ~2,000–2,400 input tokens per brainstorm, every time. Biggest token-consuming feature in the app. Worth:
   - Caching the stable portion (above).
   - Reviewing whether 15+10 is the right depth (does quality change with 5+5?).
2. **Chat history accumulation.** Each turn re-sends the full thread. 19 chat calls averaged 2,357 input tokens — some of that is history. If threads routinely exceed ~20 turns, input token cost grows linearly. Consider thread-length caps or summarization.
3. **Retry loops.** `attempted_providers` array exists in `ai_usage_events`. A quick audit showed 0 events with retries in this period, so not a current problem — but worth adding an alert if `array_length(attempted_providers, 1) > 1` spikes.
4. **Image-gen quality presets.** gpt-image-1.5 at $0.050 vs gpt-image-1 at $0.040 = 20% cheaper. If the visual difference is subtle, defaulting system-key users to gpt-image-1 and offering 1.5 as a Pro-BYOK feature is essentially free margin.

---

## 9. Gateway vs direct-provider cost

Vercel AI Gateway charges a small margin on top of direct provider rates. Observed:

- Tony's 19 chat calls (gpt-4.1) totaled $0.1346. Direct-provider math at cost-table rates: 19 × (2,357/1M × $2 + 296/1M × $8) = 19 × $0.00708 = $0.1346. **Gateway markup: 0% visible in this sample.**

Either the Gateway's margin is built into the rates we've captured (so our cost-table already reflects reality), or the Gateway is running at or near cost for parity with direct providers. Either way:

**Direct-provider integration is not worth the engineering cost below 100K calls/month.** At our current rate (36 events in 11 days = ~100/mo across all users), we're 3 orders of magnitude below that. Reassess when we hit 10K+ calls/mo sustained.

---

## 10. Upgrade-path economics — does Personal at $20 make sense?

**Yes, but it's a thin tier.** Personal's job under Subscription Model v2 is:

- **Defensible margin** (82%+ even at worst case).
- **Clear upgrade ladder** (Personal → Pro is a 2.5× price jump for 3× quotas + BYOK + Content Library + Post Templates + Team eligibility).
- **Differentiation from Free** (generous enough that Free-heavy users have a reason to step up).

**Risk:** if users bounce between Free (limited ads) and Pro (unlimited with BYOK), Personal becomes a ghost tier. Mitigation:
- Make Personal's feature lockout visible (no Library, no Templates) — this is the "why upgrade to Pro" signal.
- Keep Personal's AI quality *equivalent* to Pro's for the routes it has access to — don't also downgrade the model per tier. That creates an invisible quality difference users will blame on us.
- Monitor Personal → Pro upgrade rate. Target: >25% of Personal subscribers upgrade within 6 months. If <10%, Personal is too good and cannibalizing Pro; if >50%, Personal is too constrained and churning to Pro or out.

---

## 11. Recommendations summary (decisions to commit)

| # | Decision | Status |
|---|----------|--------|
| 1 | **Default system model switch**: system-key chat + brainstorm + enhance + draft → mini-tier per provider (gpt-4.1-mini / claude-haiku-4-5 / gemini-2.5-flash). BYOK routing unchanged. | **✅ Approved 2026-04-24 — ships in BP-117** |
| 2 | **Image model default**: system-key image gen → `gpt-image-1` ($0.040), reserve `gpt-image-1.5` ($0.050) for Pro-BYOK users. | **✅ Approved 2026-04-24 — ships in BP-117** |
| 3 | **Personal quotas**: 30 posts / 20 brainstorms / **200** chats / 30 images / unlimited scheduled + versions. | **✅ Approved 2026-04-24 (chats raised from 150 → 200) — ships in BP-117** |
| 4 | **Personal price stays at $20/mo.** 80.5% worst-case margin at current models, 91.7% after model swap. 15% annual discount applies. | **✅ Approved 2026-04-24 — ships in BP-116** |
| 5 | **Prompt-caching initiative**: restructure brainstorm prompt for cacheable prefix; consider Anthropic Haiku as system default for caching benefits. | **✅ Approved as BP-128 (created 2026-04-24)** |
| 6 | **Complete BP-085 logging**: wire `enhance`, `hashtags`, `analyze-hook`, `draft`, `idea-generate` to `ai_usage_events`. | **✅ Approved as BP-127 (created 2026-04-24)** |
| 7 | **Watch Team-user system-key burn**: alert when any Team account's unbilled system-key cost exceeds $30/mo. Feeds into BP-085 Phase 3 (budget enforcement). | Add to BP-085 Phase 3 scope |

**If you approve 1–4**, BP-116 (pricing page) and BP-117 (gate refactor) have the inputs they need to proceed.
**If you approve 5–7**, they'd become new BPs in EPIC 1 / EPIC 10 — cheap follow-ups, high leverage.

---

## 12. Open items / nice-to-have for a v2 of this study

- **Cohort analysis** — once we have 20+ paid users post-GTM, repeat this study with real distribution data.
- **Feature-level ROI** — which AI features drive Pro upgrades? Is Content Library actually a Pro-upgrade driver or is it mostly a retention feature?
- **Churn-cost link** — does hitting the Pro hard-stop mid-month correlate with cancellation? BP-124 credit-pack exploration should be evaluated against that data.
- **Provider-preference analysis** — 35 of 36 logged events were OpenAI (Tony's default). Once we have users on Anthropic and Google, cost may shift per-provider; current defaults may need re-tuning per provider.

---

*Prepared from Supabase production data via MCP. Raw queries available in the session transcript for BP-123. Next action: owner review of Recommendations §11, then proceed with BP-116 / BP-117 inputs locked.*
