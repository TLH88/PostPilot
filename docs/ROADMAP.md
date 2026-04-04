# PostPilot — Product Roadmap

> Created: 2026-04-01 | Based on 4-team product evaluation + owner feedback

## Operating Costs & Break-Even

| Expense | Monthly | Annual |
|---------|---------|--------|
| Supabase | $25 | $300 |
| AI Coding Platform | $100 | $1,200 |
| Domain (mypostpilot.app) | ~$5.42 | $65 |
| **Total** | **$130.42** | **$1,565** |
| **With 15% profit** | **$150/mo** | **$1,800/yr** |

BYOK model means $0 AI cost per user. Break-even at ~8 paying Creator users ($19/mo).

---

## Revised Pricing Tiers (BYOK Default)

Paid tiers require the user to bring their own AI API key (BYOK). Free tier users can explore the app but cannot use AI features without upgrading.

| Feature | Free | Creator ($19/mo) | Professional ($49/mo) | Team ($99/mo + $5.99/user) | Enterprise |
|---------|------|-------------------|----------------------|---------------|-----------|
| BYOK (required) | No | Yes | Yes | Yes | Yes |
| AI Models | — | All user's models | All | All | All |
| Posts/month | 3 | Unlimited | Unlimited | Unlimited | Unlimited |
| Brainstorms/month | 2 (10 ideas) | 15 | Unlimited | Unlimited | Unlimited |
| AI Chat messages/month | 20 | 200 | Unlimited | Unlimited | Unlimited |
| Enhance/Hashtags | Yes | Yes | Yes | Yes | Yes |
| Post scheduling | 2 scheduled | 15 | Unlimited | Unlimited | Unlimited |
| Content calendar | View only | Full | Full | Full | Full |
| Post versions | 1 per post | 5 per post | Unlimited | Unlimited | Unlimited |
| Post history | 30 days | 6 months | 1 year | 1 year | Unlimited |
| Content Library | No | Yes | Yes | Yes | Yes |
| Hook Analysis | No | Yes | Yes | Yes | Yes |
| Manual Analytics | No | Yes | Yes | Yes | Yes |
| Post Templates | No | Yes | Yes | Yes | Yes |
| Image generation | No | 5/month | Unlimited | Unlimited | Unlimited |
| Ad-free experience | No | Yes | Yes | Yes | Yes |
| Team Workspaces | No | No | No | Yes | Yes |
| Team Members | — | — | — | 5–150 | 150+ |
| Brand Onboarding | No | No | No | Yes | Yes |
| Support | Community | Email | Priority | Priority | Dedicated |

**Annual pricing:** Creator $190/yr, Professional $490/yr, Team $990/yr (all 17% off). Enterprise: custom pricing.

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

- [ ] System-level API keys via environment variables (SYSTEM_AI_KEY_OPENAI, SYSTEM_AI_KEY_ANTHROPIC, etc.)
- [ ] managed_ai_access flag + managed_ai_expires_at on creator_profiles (auto-granted to new accounts for 14 days)
- [ ] AI client fallback chain: personal key → managed system key → error
- [ ] Settings UI: "Trial AI Access" badge with expiry countdown
- [ ] Manual override: admin can grant/revoke access per user via Supabase

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

1. **BYOK is default across all tiers** — zero AI cost to us, users control their costs
2. **Free tier shows full AI quality** — usage-limited, not feature-crippled on AI
3. **Two separate OAuth flows** — Supabase OIDC for login, custom OAuth for posting (Supabase doesn't persist LinkedIn tokens)
4. **Supabase Edge Function + pg_cron for scheduling** — zero additional cost vs Vercel Cron ($20/mo)
5. **JWT signature verification** — HMAC-SHA256 for Edge Function auth, no shortcuts
6. **`develop` branch for new features** — `main` stays stable for production
