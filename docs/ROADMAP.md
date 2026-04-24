# PostPilot — Product Roadmap

> Created: 2026-04-01 | Revised 2026-04-24 for Subscription Model v2 pricing pivot (see BP-115).

## Operating Costs & Break-Even

| Expense | Monthly | Annual |
|---------|---------|--------|
| Supabase | $25 | $300 |
| AI Coding Platform | $100 | $1,200 |
| Domain (mypostpilot.app) | ~$5.42 | $65 |
| **Fixed infra total** | **$130.42** | **$1,565** |
| **With 15% profit** | **$150/mo** | **$1,800/yr** |

**Variable AI cost (under Subscription Model v2):** We now eat AI cost for Free + Personal tiers and for Pro users who don't BYOK. See BP-123 (token cost study) for worst-case per-user math; that study gates the final Personal-tier quotas and default-model choice.

---

## Subscription Model v2 — Pricing Tiers (pivoted 2026-04-24)

Under v2, **BYOK is gated to Pro and Team tiers.** Free and Personal users use PostPilot's system AI keys with tier-specific quotas. Professional users can opt into BYOK for unlimited usage. Team users get BYOK included and are encouraged to use it.

| Feature | Free ($0) | Personal ($20/mo) | Professional ($50/mo) | Team ($100/mo + $6/user) |
|---------|-----------|-------------------|-----------------------|--------------------------|
| AI keys | System only | **System only — no BYOK** | System **or** BYOK | BYOK (included, encouraged) |
| Posts / month | 3 | Personal quota (TBD, BP-123) | 100 (system) · Unlimited (BYOK) | Unlimited |
| Brainstorms / month | 2 (10 ideas) | Personal quota | 200 (system) · Unlimited (BYOK) | Unlimited |
| AI Chat messages / month | 20 | Personal quota | 500 (system) · Unlimited (BYOK) | Unlimited |
| Image generation / month | No | Personal quota | 200 (system) · Unlimited (BYOK image provider) | Unlimited |
| Scheduled posts | 2 total | Personal quota | Unlimited | Unlimited |
| Post versions | 1 per post | Personal quota | Unlimited | Unlimited |
| AI Enhancement & Hashtags | Yes (within quota) | Yes (within quota) | Yes | Yes |
| AI Hook Analysis | No | Yes | Yes | Yes |
| Post Performance Analytics | No | Yes | Yes | Yes |
| Content Library | No | **No** | Yes | Yes |
| Post Templates | No | **No** | Yes | Yes |
| Content calendar | View only | Full | Full | Full |
| Post history | 30 days | 6 months | 1 year | 1 year |
| Ad experience | Full (intrusive placements OK) | **Limited** (non-intrusive only) | None | None |
| Team Workspaces | No | No | No | Yes |
| Team Members | — | — | — | 5–150 |
| Brand Onboarding | No | No | No | Yes |
| Support | Community | Email | Priority | Priority |

**Annual pricing (15% off):** Personal $204/yr, Professional $510/yr, Team $1020/yr base + $61.20/yr per user. Enterprise: custom.

**Key mechanics:**
- **Hard stop on Pro system-key quotas.** No overage billing, no auto-queue. Upgrade-to-unlimited prompt offers "Add personal API keys" (BYOK) or "Upgrade to Team." Credit-pack alternative explored in BP-124.
- **System keys disabled when BYOK is active** for a given user — never used as a fallback when personal keys are present.
- **Free trial:** Free and Personal users can start a 14-day Pro trial with full access to Professional features. No card required. One-time per account (365-day cooldown). Team users are not eligible — there's no higher tier.
- **Personal-tier quotas** are not yet final; BP-123 (token cost study) informs the numbers before BP-117 ships.

---

## Phase 0: Foundation — COMPLETED (2026-04-01)

All items done and deployed.

- [x] QA fixes: Zod validation, structured error logging, constants extraction (BP-012)
- [x] Hook Analysis: `/api/ai/analyze-hook` endpoint + UI card in post editor (BP-008)
- [x] History-enhanced brainstorming: past posts + pillar distribution injected into AI context (BP-009)
- [x] Content pillar distribution: dashboard card with progress bars (BP-010)
- [x] Export to LinkedIn: one-click clipboard copy with formatting (BP-011)

## Phase 0.5: LinkedIn Integration — COMPLETED (2026-04-01)

- [x] LinkedIn Direct Posting via API: custom OAuth, 5 API routes, encrypted token storage (BP-013)
- [x] Scheduled Auto-Publishing: Supabase Edge Function + pg_cron, JWT signature verification (BP-014)

---

## Phase 1: Monetization Foundation + Creator Tier Value

*Must be completed before any revenue. Makes Creator tier worth $19/mo.*

### Billing Infrastructure
- [ ] Stripe billing integration + subscription management
- [ ] Usage quota system (posts/month, brainstorms/month, chat messages/month)
- [ ] Pricing page with tier comparison table
- [ ] Feature gating logic (check tier before allowing feature access)
- [ ] Upgrade/downgrade flow

### Creator Tier Features
- [ ] Content Library — save/reuse hooks, CTAs, templates, closing lines (new Supabase table, CRUD UI)
- [ ] Post Templates — pre-built structures: story arc, hot take, how-to, listicle, question, framework
- [ ] Manual Analytics — self-report engagement numbers (likes, comments, reposts), track over time
- [ ] Advanced scheduling suggestions — static best-time-to-post data based on LinkedIn research
- [ ] Content pillar dashboard — visual breakdown of posting distribution (enhanced version of current)
- [ ] Bulk idea development — convert multiple ideas to posts in one action
- [ ] Export to LinkedIn — enhanced one-click copy with formatting preserved (clipboard API)

---

## Phase 2: Differentiation

*Features that separate PostPilot from competitors.*

### Brand/Team Support
- [ ] Brand/Team onboarding path — workspace type selector ("Individual Creator" vs "Brand/Team")
- [ ] Brand onboarding captures: brand name, UVP, target audience personas, brand voice guidelines, sample content, content pillars
- [ ] Multi-user workspaces — invite members via email, role-based access (Admin/Editor/Viewer)
- [ ] Posts belong to workspace, not individual user
- [ ] Publishing account designation (workspace owner's LinkedIn)

### Analytics
- [ ] LinkedIn API analytics — read post engagement data (requires LinkedIn app approval for `r_member_social`)
- [ ] CSV import — let users paste LinkedIn analytics CSV export
- [ ] Performance tracking dashboard — likes, comments, reposts over time
- [ ] Content pillar ROI — which pillars drive the most engagement

### AI Enhancements
- [ ] Trending topics integration — RSS feeds from industry blogs/news injected into brainstorm context
- [ ] Voice consistency validation — compare generated text against voice samples, show tone score
- [ ] Hook analysis endpoint improvements — dedicated analysis with strength rating + improvement suggestions
- [ ] Guided enhancement workflows — replace generic "Enhance" with templates: "Add hook", "Make it story-driven", "Add social proof", "Improve CTA"

---

## Phase 3: Pro Tier Features

*Premium features for the $49/mo tier.*

- [ ] Image generation — DALL-E 3 via existing OpenAI BYOK keys (~$0.04-0.08/image, zero cost to us)
- [ ] Approval workflows — draft review/approve chain for teams
- [ ] Bulk operations — batch brainstorm, batch schedule, batch archive
- [ ] A/B testing for hooks/CTAs — generate multiple versions, track which performs better
- [ ] Content pillar ROI dashboard — which pillars drive the most engagement (requires analytics)

---

## Managed AI Access (Trial & Beta System)

*System-level AI keys that provide free/trial users with full AI functionality without configuring their own API keys.*

- [x] System-level API keys via environment variables (SYSTEM_AI_KEY_OPENAI, SYSTEM_AI_KEY_ANTHROPIC, etc.)
- [x] managed_ai_access flag + managed_ai_expires_at on creator_profiles (auto-granted to new accounts for 14 days)
- [x] AI client fallback chain: personal key → managed system key → error
- [x] Settings UI: "Trial AI Access" badge with expiry countdown
- [x] Admin panel: grant/revoke access, change tiers, manage users and workspaces, create announcements

---

## Phase T1: Team Collaboration Core

*Foundation for team-based content creation. Build first — these are early differentiators.*

- [ ] Post assignment & ownership — assign posts to team members, "My Assignments" view, assignee on cards
- [ ] In-app comments on posts — threaded comments, @mentions, resolve/unresolve
- [ ] Activity feed — workspace-wide feed: who did what, when (created, edited, assigned, approved, published)
- [ ] Notifications center — bell icon with unread count, assignment/mention/approval/comment/deadline alerts

## Phase T2: Approval Workflows

*Formalizes the review/approval process. Required for brand trust.*

- [ ] Configurable approval workflow — workspace-level stages (Draft → Review → Approved → Publish), per-post approval tracking with feedback
- [ ] Review queue — dedicated view for reviewers, quick approve/request changes, pending count badge
- [ ] Approval history & audit trail — immutable log of who approved what version, when, with what feedback

## Phase T3: Reporting & Governance (Enterprise)

*Enterprise requirements for compliance, brand control, and team metrics.*

- [ ] Team performance dashboard — posts per member, avg engagement per member, content velocity, bottleneck analysis
- [ ] Brand consistency scoring — AI checks posts against brand voice guidelines, shows alignment score before publishing
- [ ] Content briefs — create briefs with topic/key points/deadline, assign to writers, link to resulting posts
- [ ] Content policies — automated pre-publish checks (min chars, requires image, brand score threshold)

## Phase T4: Advanced Team Features

*Nice-to-haves that round out the team experience.*

- [ ] Calendar reservations — claim publishing slots before posts are written
- [ ] Bulk review actions — select multiple posts, approve/reject/assign in batch
- [ ] Custom approval workflows — different flows per content type
- [ ] Email notifications — assignment/mention/approval emails, daily digest option
- [ ] Publishing permissions — role-based publish restrictions (editors draft, only admins publish)
- [ ] Deadline tracking — due dates on posts, overdue warnings, escalation

---

## Phase 5: Future Exploration (Not Currently Planned)

These were identified in the product evaluation but are beyond current scope:

- Multi-platform content creation and publishing (Facebook, Instagram, X/Twitter, TikTok, Substack) — adapt post format, character limits, and hashtag strategies per platform
- Email newsletter creation
- Zapier/Make integrations
- Calendar app sync (Google Cal, Outlook)
- Slack/Teams notifications
- LinkedIn DM/engagement automation
- Custom AI voice fine-tuning

---

## Go-to-Market Strategy

See `docs/GTM-STRATEGY.md` for full details. Key points:

- **Founder pricing:** 40% off for first 500 customers
- **Early adopter program:** Alpha testers get Creator free for 3 months
- **Referral:** $20 credit per referred paying customer
- **Dog-fooding:** Use PostPilot to create LinkedIn content about PostPilot
- **Positioning:** "The only LinkedIn tool that keeps YOUR voice authentically you"

## Key Decisions Made

1. ~~**BYOK is default across all tiers**~~ **REVERSED 2026-04-24 (Subscription Model v2):** BYOK is gated to Pro+ tiers. Free and Personal use system keys with quotas. See BP-115.
2. **Free tier shows full AI quality** — usage-limited, not feature-crippled on AI
3. **Two separate OAuth flows** — Supabase OIDC for login, custom OAuth for posting (Supabase doesn't persist LinkedIn tokens)
4. **Supabase Edge Function + pg_cron for scheduling** — zero additional cost vs Vercel Cron ($20/mo)
5. **JWT signature verification** — HMAC-SHA256 for Edge Function auth, no shortcuts
6. **`develop` branch for new features** — `main` stays stable for production
7. **Pro-tier quota hard stop (2026-04-24):** No overage billing. Exhausted Pro users must BYOK or upgrade to Team. Credit packs explored as a softening mechanism (BP-124).
8. **Terminology rename (2026-04-24):** "Creator tier" → "Personal" AND "Creator Profile" → "User Profile" (full end-to-end rename — see BP-114 extended scope).
