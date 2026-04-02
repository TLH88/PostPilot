# PostPilot - Activity Log

> Tracks development sessions, decisions, and changes.

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
