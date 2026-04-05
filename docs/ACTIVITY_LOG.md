# PostPilot - Activity Log

> Tracks development sessions, decisions, and changes.

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
