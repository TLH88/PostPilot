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

All tiers require the user to bring their own AI API key (BYOK). PostPilot provides zero AI access — the user must have a key to complete onboarding.

| Feature | Free | Creator ($19/mo) | Professional ($49/mo) |
|---------|------|-------------------|----------------------|
| BYOK (required) | Yes | Yes | Yes |
| AI Models | All user's models | All | All |
| Posts/month | 3 | Unlimited | Unlimited |
| Brainstorms/month | 2 (10 ideas) | 15 | Unlimited |
| AI Chat messages/month | 20 | 200 | Unlimited |
| Enhance/Hashtags | Yes | Yes | Yes |
| Post scheduling | 2 scheduled | 15 | Unlimited |
| Content calendar | View only | Full | Full |
| Post versions | 1 per post | 5 per post | Unlimited |
| Post history | 30 days | 6 months | 1 year |
| Content Library | No | Yes | Yes |
| Hook Analysis | No | Yes | Yes |
| Manual Analytics | No | Yes | Yes |
| Post Templates | No | Yes | Yes |
| Image generation | No | 5/month | Unlimited |
| Team/collaboration | No | No | Yes (future) |
| Support | Community | Email | Priority |

**Annual pricing:** Creator $190/yr (17% off), Professional $490/yr (17% off)

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

## Phase 4: Future Exploration (Not Currently Planned)

These were identified in the product evaluation but are beyond current scope:

- Multi-platform support (Twitter/X, Substack)
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
