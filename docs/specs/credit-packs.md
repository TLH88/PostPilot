# BP-124 — Credit Pack Purchase Exploration (Pro Tier)

> **Status:** Spec only. No code changes. Authored 2026-04-23 as the exploration deliverable for BP-124.
> **Parent:** BP-115 (Subscription Model v2). **Depends on:** BP-015 (Stripe Billing Integration) shipping first.
> **Primary inputs:** `docs/cost-studies/2026-04-token-cost-study.md` (per-call costs, Pro worst-case margins), `docs/BACKLOG.md` (BP-115 tier matrix, BP-124 scope).

---

## TL;DR

- **Recommend 3 packs, Pro-only, additive (not bucket-merged), 90-day rolling expiration**: `+25 Posts` ($8), `+50 Images` ($8), `+250 Chats + 100 Brainstorms` ($5). Each carries a 70–80% gross margin even at cost-study worst-case rates on gpt-4.1-mini + gpt-image-1.
- **Credits sit in a separate bucket** that debits *only after* the monthly quota is exhausted. The "hard stop" upgrade modal gains a third CTA ("Buy credit pack") alongside the existing "Add API keys" and "Upgrade to Team" options.
- **Expiration: 90 days from purchase.** Not calendar-month (too punitive), not indefinite (too much deferred-revenue liability and cost drift). 90 days matches typical SaaS top-up norms and means unused credits from a good month still cover a bad one.
- **Hold the build.** Do not ship credit packs in the first post-BP-015 sprint. Gate on real post-GTM data: (a) ≥10 paid Pro users have existed ≥60 days, (b) at least 3 of them have hit a hard-stop wall, (c) at least 1 has explicitly asked for packs or churned citing the wall. Until then we are pricing a product for a problem we cannot yet prove exists.
- **Tier eligibility: Pro only.** Personal's contract is "predictable $20/mo" — selling top-ups violates that promise. Team gets BYOK by default and already has no practical quota ceiling; packs there are a non-feature.

---

## Build-now vs. hold decision

**Recommendation: hold until post-GTM data justifies it.** Build spec-only now (this memo), ship code only after a defined threshold.

**Arguments for building immediately after BP-015:**
- Relieves the single sharpest UX wall in the Pro tier (the hard stop). Every lost sale at the wall is pure revenue gone.
- Credit packs are high-margin ARPU expansion on top of subscription revenue; a user buying a $8 pack is the cheapest upsell we will ever see.
- Stripe infrastructure is already paid for once BP-015 lands — adding one-time Prices is incremental work, not a new integration.
- Shipping with packs available signals "we won't arbitrarily block you" to prospective Pro buyers evaluating the hard-stop copy.

**Arguments for holding (the stronger side):**
- **Zero signal.** 6 beta users, none paid, none have hit v2 quotas because v2 gates aren't live yet (BP-117 pending). Any pack we price today is a guess on a population of 0.
- **The cost study already shows the hard stop is mostly theoretical at our volumes.** Tony — the heaviest observed user — runs 32 images, 86 chats, 14 brainstorms, 7 posts per month. All well under Pro's 200/500/200/100. We cannot yet point to a single real user who would buy a pack.
- **BYOK is the intended release valve.** The entire Subscription Model v2 argument is that Pro users who hit the wall should Bring Their Own Key. Credit packs compete with BYOK for the same slot in the upgrade modal and muddy that message. Shipping both on day 1 risks confusing the positioning before BYOK gets a fair test.
- **Premature pack sizing is expensive to unwind.** Stripe Prices are immutable; if we list a pack and then learn the right size is 2× smaller, we have to create new Products and migrate copy, emails, help docs. One round of that is fine; doing it because we rushed is avoidable.
- **P3 / Low priority in the backlog already reflects this.** BP-124 sits in "Post-launch ARPU & polish" (Sprint 6), explicitly after the core revenue loop ships. The backlog author was right.

**Chosen path:** spec now (this doc), build after meeting **all three** of these gates:
1. ≥10 paid Pro subscribers have been on the plan ≥60 days.
2. ≥3 of them have exhausted at least one monthly quota at least once.
3. ≥1 of them has either (a) asked for packs in support, (b) churned within 14 days of hitting the wall, or (c) answered a "would you pay to extend this month?" in-app survey with yes.

If all three fire, ship the MVP below in a single sprint. If only the third fires and volume is low, consider a manual Stripe Invoice top-up as a concierge bridge before building the full system.

---

## 1. Pack sizes + prices

All costs below use the **approved post-swap rates** from the cost study: gpt-4.1-mini for text ($0.0017/chat, $0.002/brainstorm, $0.0025/post ancillaries), gpt-image-1 for images ($0.040/image). Margins are worst case — every credit burned at full allowance.

| Pack | Grants | Size | Price | Cost to serve | Gross margin | Value framing |
|------|--------|------|-------|---------------|--------------|---------------|
| **Post Booster** | +posts (adds draft + enhance + hashtag + analyze calls, ~4 ancillaries/post) | 25 posts | **$8** | 25 × $0.0025 = **$0.0625** | **99%** | "A full week of publishing, right now." |
| **Image Booster** | +image generations | 50 images | **$8** | 50 × $0.040 = **$2.00** | **75%** | "Cover art for your next 50 posts — never break flow." |
| **Conversation Topup** | +chats and +brainstorms (combined bucket: 1 brainstorm = 1 credit, 1 chat = 1 credit, capped at +100 brainstorms) | 250 credits | **$5** | worst case 100 × $0.002 + 150 × $0.0017 = $0.20 + $0.255 = **$0.455** | **91%** | "Keep the assistant talking — roughly another half month of AI chat." |

**Math sanity check vs. Pro monthly economics.** Pro worst-case at Pro quotas on mini-tier = ~$9.50/mo (cost study §4.2). One Image Booster ($8 revenue, $2 cost) yields $6 gross — more than half a user's monthly cost. Packs are high-leverage revenue even at low attach rates.

**Why these three, not more:**
- Posts, images, and conversational AI (chat+brainstorm) are the three quota dimensions. Any fourth pack would dilute the choice without covering new ground.
- Image is the only pack where margin is meaningfully exposed to user abuse — hence the smallest size (50) relative to Pro's monthly 200 quota. A larger Image pack at this price would turn a bad cohort into a real cost.
- Bundling chat+brainstorm into one pack reflects their shared role (lightweight exploratory AI) and hides the quota boundary users don't think about.

**Do not offer a "mega pack."** One-pack-fits-all invites users who rarely hit the wall to hoard credits; see expiration discussion below. Keeping packs small forces repeat purchase, which keeps us close to real demand signal.

---

## 2. Expiration policy

**Recommendation: credits expire 90 days from the purchase date, rolling.** Each pack is its own expiration cohort.

**Alternatives considered:**
- *Indefinite rollover:* creates deferred-revenue liability under GAAP (unused credits must be tracked as obligations), risks cost drift if model pricing moves, and lets abuse patterns accumulate (e.g., someone buys one Image pack, sits on it for a year, redeems when we've raised underlying provider rates).
- *End-of-calendar-month:* actively hostile. Users who buy a pack on the 28th get 2 days of value. Guarantees a bad review.
- *Next subscription renewal:* neutral at best, punitive on short billing cycles. A user who tops up the day before renewal loses everything.
- *90 days rolling (pick):* long enough that one quiet month doesn't burn credits, short enough that liability stays bounded and Stripe metadata can carry a hard expiration timestamp. Matches the "sometimes I have a busy month" real use case we're actually solving for.

**Edge cases:**
- **Cancellation mid-month with unused credits.** Credits remain usable for the remainder of the 90-day window **as long as the account exists**. Account deletion forfeits credits; cancellation-to-Free keeps them (see tier-eligibility note below on downgrade-to-Personal).
- **Refund request for an unused pack.** Honor within 7 days of purchase, pro-rate after 7 days if any credits have been consumed (or deny — see anti-abuse).
- **Model price moves under us.** 90 days is short enough that a provider price hike mid-window is absorbable. Longer windows would force us to build reserve accounting.
- **Pro-to-Pro renewal.** Credits survive renewal. They're tied to the account, not the billing cycle.

---

## 3. Tier eligibility

**Recommendation: Pro only.** Not Personal, not Team.

**Why not Personal.** Personal's entire product promise under Subscription Model v2 is "$20/mo, predictable, system-managed keys, no surprises." Introducing a top-up flow on Personal:
- Breaks the predictability contract we sell them.
- Invites "I already pay $20, why am I being asked for more money" complaints — which are legitimate, because Personal quotas (30/20/200/30) are designed to comfortably cover the heaviest observed user with headroom (see cost study §5).
- Undermines the upgrade path to Pro. The correct escape valve for a Personal user who needs more is "upgrade to Pro," full stop. Selling them packs muddies that.

**Why not Team.** Team includes BYOK by default and is effectively unlimited on the Team user's own provider account. A Team user who burns system keys enough to hit a wall is an operational anomaly (per cost study §4.1 — "track as a KPI, reach out with BYOK onboarding"), not a pack-purchase candidate.

**Pro only.** Pro is the only tier where the hard-stop wall is both (a) a real product surface and (b) a legitimate alternative to BYOK for a user who doesn't want to manage keys. Packs fit here naturally.

---

## 4. Credit semantics

**Recommendation: additive (separate bucket), consumed only after monthly quota is exhausted.**

Flow per quota dimension (e.g., posts):
1. User has monthly quota of 100 posts (reset on billing anniversary).
2. User has 0+ pack credits of each pack type (each with its own expiration).
3. On each billable action, `checkQuota()` first decrements from the monthly quota.
4. When monthly quota = 0, `checkQuota()` looks at the pack-credit bucket; if credits exist, decrement from the oldest-expiring cohort first (FIFO by expiration date).
5. When both buckets are empty, hit the hard stop.

**Why additive and not merged-bucket:**
- **Preserves the subscription's value prop.** "Your Pro plan includes 100 posts" stays a true, clean statement. Packs are top-ups, not replacements.
- **Clean accounting.** We always know how much usage was covered by subscription revenue vs. pack revenue. This matters for cost attribution and for detecting abuse (see §7).
- **Predictable renewal.** On billing anniversary, monthly quota resets to 100 regardless of pack balance. Users don't need to reason about mixed buckets.
- **UX clarity.** Settings can show two readouts: "Monthly: 3/100 used" and "Pack credits: 25 posts, 50 images, 250 conversations (expires Jul 21)." Merged bucket would require explaining which credits come from where.

**Interaction with the hard-stop modal (existing).** When monthly quota hits zero and no pack credits exist, we show the current "You've reached your monthly limit" modal. Add a third CTA:
- Primary: "Add your own API keys (unlimited usage)" — unchanged, still the intended escape valve.
- Secondary: "Upgrade to Team" — unchanged.
- Tertiary: "Buy a credit pack" — new, opens pack-selection drawer.

If monthly quota is zero **but** pack credits exist, we silently continue — no modal, no interruption. User only sees a subtle "Using pack credits" pill in the quota readout.

---

## 5. Stripe product structure

**Stripe objects (one per pack type):**

- `Product: credit_pack_posts_25` — one Product
  - `Price: price_posts_25_usd` — one-time, $8 USD, `billing_scheme=per_unit`, `recurring=null`
  - Product metadata: `pack_type=posts`, `credit_amount=25`, `quota_extension=posts`, `version=1`
- `Product: credit_pack_images_50` — $8, metadata `pack_type=images, credit_amount=50`
- `Product: credit_pack_conversations_250` — $5, metadata `pack_type=conversations, credit_amount=250, brainstorm_cap=100`

**Why one Product per pack type, not one with variants.** Stripe's Price-per-Product model is cleaner for reporting (we can see revenue per pack), and the metadata difference (brainstorm_cap) makes a variant model clunky. Three Products is fine at this scale.

**Metadata fields (on the Price, not user-editable at checkout):**
- `pack_type` — enum `posts | images | conversations`
- `credit_amount` — integer
- `quota_dimensions` — comma-separated list of which `usage_quotas` dimensions this extends (`chats,brainstorms` for conversations; `posts` for posts; `images` for images)
- `brainstorm_cap` — only on the conversations pack, caps brainstorm credits at 100 of the 250 total
- `expiration_days` — `90`
- `version` — integer, bump when we reissue with different sizes

**Credit-issuance webhook.** On `checkout.session.completed` with `mode=payment`:
1. Verify the webhook signature (Stripe signing secret, server-only).
2. Look up the Price on the session → read metadata.
3. Resolve the PostPilot user from `client_reference_id` (set when we create the Checkout Session) or from `customer_email` if reference is missing.
4. Insert a row into a new `user_credit_packs` table:
   - `id uuid PK`
   - `user_id uuid FK`
   - `stripe_session_id text unique`
   - `pack_type text` (posts | images | conversations)
   - `credits_granted integer`
   - `credits_remaining integer` (decremented as credits are spent)
   - `expires_at timestamptz` (purchase + 90 days)
   - `created_at timestamptz`
5. Return 200 to Stripe only after the row commits. Make the handler idempotent by the unique constraint on `stripe_session_id`.

**Credit-debit flow (modifies existing `src/lib/quota.ts`):**
- `checkQuota(userId, dimension)`: current function at `src/lib/quota.ts:109`. Extend it to also query `user_credit_packs` where `user_id = $1 AND pack_type matches dimension AND credits_remaining > 0 AND expires_at > now()`. Return `{ monthlyRemaining, packCredits: [...], totalAvailable }`.
- `incrementQuota(userId, dimension)`: current function at `src/lib/quota.ts:145`. Extend its debit logic: decrement monthly quota if available; otherwise decrement `credits_remaining` on the pack row with the earliest `expires_at` (FIFO). Do this in a single transaction to avoid double-debits under concurrent requests.
- The hard-stop check at the call site should now test `totalAvailable > 0` instead of just the monthly remaining.

All of this extends the existing module — no new enforcement surface, no duplication, one source of truth.

---

## 6. User-facing flow sketch

**Scenario:** Pro user at 95/100 posts, approaching the wall.

1. **Warning zone (quota ≥80% used).** Quota readout in the header shows "95/100 posts this month" with a subtle amber dot. No modal, no interruption. Optional: a one-time toast at 90% — "Running low? You can top up with a credit pack" with a "See packs" link.
2. **At the wall (101st post attempt).** Existing hard-stop modal opens. Copy: "You've hit your monthly post limit." Three CTAs as specified in §4. The pack CTA is tertiary — lowest visual weight — because BYOK is still the intended path for a committed power user.
3. **Pack selection.** Clicking "Buy a credit pack" opens a drawer (not a full page navigation — we don't want to kick the user out of their editor). Drawer shows the three packs with price, grant, and current-session framing: "You ran out of posts — this pack adds 25 more, usable for 90 days." Purchase button per pack.
4. **Checkout.** Use **Stripe Checkout (hosted redirect)**, not Elements. Rationale:
   - It's a one-time payment for a fixed SKU — Checkout handles it natively.
   - Elements requires building our own form, PCI scope, and maintenance; no benefit at our volume.
   - `client_reference_id` carries the `user_id`. `success_url` returns the user to the editor with a `?pack=success` flag. `cancel_url` returns them with no flag.
5. **Confirmation + immediate restore.** On redirect back with `?pack=success`:
   - Show a success toast: "Pack added — 25 posts ready."
   - Force a client-side refetch of `/api/quota/current` so the quota readout updates.
   - Retry the action the user was blocked on if we can (single action, low risk) — or nudge them with "Ready to continue where you left off?"
   - If the webhook is slow (race between redirect and webhook commit), show a "Just a moment, applying your credits…" state and poll every 2s for up to 30s before falling back to an explicit "Your credits will appear shortly — refresh if not visible in a minute" message.

**Do NOT use Stripe Customer Portal for pack purchase.** The Portal is for subscription management (cancel, update card, download invoice). Packs are one-time add-ons and belong in our own in-app flow.

---

## 7. Anti-abuse and edge cases

**Refund policy (draft).**
- Full refund within 7 days **if zero credits consumed**. Automated via Stripe Dashboard.
- No refund after any consumption — credits are digital goods with no recoverable cost to us.
- Document this in the checkout copy and in the help center. Publish before launch, not after the first complaint.

**Pack bought during a trial.** Trials are Free-tier users on a managed-key runway. Packs are Pro-only. Ineligible users cannot see the CTA — gated server-side on `tier === 'creator_pro'` (internal key; display-only rename to "Professional" per the tier-rename memory). If a user downgrades while on trial, the pack CTA disappears.

**Pack bought on Pro, then downgrade to Personal or Free.** Credits persist on the account for the remainder of the 90-day window, but **are only consumable while the account is Pro**. On Personal or Free, the credits sit dormant. If the user re-upgrades to Pro within 90 days, credits resume. If 90 days lapse on a lower tier, credits expire and are gone. This is the cleanest policy: it respects Pro-gating without punishing a temporary downgrade, and it avoids pricing arbitrage ("subscribe to Pro for 1 month, buy 20 packs, drop to Personal"). Document in help + purchase confirmation.

**Stripe metadata tampering.** Stripe metadata is server-set and user-visible but not user-editable at checkout. The webhook must:
- Verify the webhook signature with the Stripe signing secret.
- Look up the Price ID on the session server-side and read metadata from the Price object, **not** from any field echoed by the client.
- Never trust `client_reference_id` as anything more than a lookup hint — re-validate the user's Pro status server-side before granting credits.
- Reject any session where `amount_total` does not match the expected Price total (defense against tampered checkouts — Stripe prevents this, but belt-and-braces).

**Pack stacking.** Nothing prevents a user from buying the same pack twice. Each purchase = a separate row with its own expiration. FIFO debit means the oldest expires first, which is the user-favorable behavior. Cap: maximum 3 packs of the same type per 7 days (soft cap via application check, returns a friendly "you're set — that's 150 posts of credit already" message). Prevents runaway accidental clicks and gives us a signal if someone is genuinely in trouble usage-wise.

**Chargebacks.** On `charge.dispute.created` webhook, zero out `credits_remaining` on the corresponding pack row and log for manual review. Do not attempt to auto-reverse — let the dispute resolve first.

---

## Open questions for owner

1. **Build gate threshold.** I proposed (≥10 Pro users for ≥60 days) AND (≥3 hit the wall) AND (≥1 asked or churned-at-wall). Agree, tighten, or loosen? This is the single biggest call in the memo.
2. **Pack prices.** $8 / $8 / $5 are educated guesses calibrated to 75–99% margin. Do we want to push harder on price (e.g., $10 / $12 / $6) to test willingness-to-pay, or lead with lower prices to drive attach rate?
3. **Expiration window.** 90 days rolling is my pick. Alternatives: 60 days (tighter, pushes purchase closer to need), 180 days (generous, matches longer use cycles). 90 is a midpoint — confirm.
4. **Image pack size.** 50 images is deliberately conservative relative to Pro's 200/mo quota. Would you prefer 25 (even safer margin, more re-purchase friction) or 100 (more generous, but margin drops to ~50%)?
5. **Conversations pack bundling.** I bundled chat+brainstorm with a brainstorm cap of 100. Would you rather split into two packs (Chat Topup, Brainstorm Topup) for clarity, accepting more SKUs?
6. **Tier eligibility for Personal.** I said Pro only. Confirm you agree Personal should not have packs, even if a Personal user asks. (This is a policy call, not a technical one.)
7. **Refund window.** 7 days with zero-consumption requirement. Match Stripe's default dispute window (also 7d) or lengthen to 14d for goodwill?
8. **Concierge bridge before building.** If gate-condition (1) fires before (2) and (3), do we want to support manual Stripe Invoice top-ups (I issue a one-off invoice, grant credits manually) as a bridge, or wait until the full gate fires and build the product?
9. **Do packs count toward the annual 15% discount?** I've assumed no — packs are one-time purchases and shouldn't participate in annual pricing. Confirm.
10. **Surface area in Settings.** Should `/settings/billing` expose a pack purchase CTA (standalone, not wall-triggered), or are packs purely a wall-recovery surface? Surfacing everywhere raises attach rate but risks eroding Pro's "you have enough" framing.

---

*Prepared 2026-04-23 as the BP-124 exploration deliverable. Build decision deferred pending post-GTM data per §Build-now vs. hold.*
