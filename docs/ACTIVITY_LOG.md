# PostPilot - Activity Log

> Tracks development sessions, decisions, and changes.

---

## 2026-04-16: Team Collaboration Features, Trial System, Analytics Polish

### BP-087: Published Post View + BP-025 API Prep
- New route `/posts/{id}/published` — dedicated read-only view for posted content
- Redirect from editor when post status is "posted" (unless `?edit=true`)
- Full engagement analytics card with inline-editable metrics and engagement rate calculation
- "Duplicate as Draft" action creates editable copy
- "Edit Original" link opens editor with amber warning banner
- BP-025 API infrastructure: `/api/linkedin/analytics` endpoint, `fetchPostEngagement()` helper using `memberCreatorPostAnalytics` LinkedIn API
- `analytics_fetched_at` timestamp on posts, `linkedin_scopes` array on creator_profiles
- Auto-refresh button with graceful "scope required" fallback UI
- LinkedIn app approval for `r_member_postAnalytics` scope is a blocker — manual analytics entry remains the default path

### Account Lifecycle & Trial System
- Added `account_status` field: `active | trial | suspended | churned`
- Added trial tracking: `original_tier`, `trial_tier`, `trial_started_at`, `trial_ends_at`, `last_trial_tiers` (jsonb for 365-day cooldowns)
- Self-service trial flow from pricing page: click "Start Free Trial" on Creator/Pro → 14-day trial with full features and managed AI access
- `POST /api/trial/start` — validates tier, enforces cooldown, sets all trial fields
- `POST /api/trial/check-expiry` — called on app layout mount (TrialExpiryChecker component), auto-reverts expired trials to original_tier and records in last_trial_tiers
- Pricing page now context-aware: "Start Free Trial" / "Upgrade" / "Current Plan" based on user state
- Settings shows trial banner with days remaining + Upgrade link
- AI client `hasManagedAccess()` grants access to active trial users
- Admin user table shows trial start date, days remaining, tier being trialed, with quick-pick dropdown for duration

### BP-023, BP-046-051: Team Collaboration Suite
- New schema: `post_comments`, `activity_log`, `notifications`, `post_approvals` (RLS-secured)
- Posts extended with: `assigned_to`, `assigned_by`, `assigned_at`, `approval_stage`, `approval_status`
- Workspaces extended with: `workspace_type` (individual/brand), `approval_stages`, `requires_approval`, `onboarding_completed`, `brand_sample_posts`

**Shared helpers:**
- `logActivity()` — workspace activity feed
- `createNotification()` / `createNotifications()` — in-app notifications with email delivery prep fields

**BP-023: Brand/Team onboarding**
- `WorkspaceTypeSelector` component at `/onboarding/type` (Individual vs Brand/Team)
- Workspace setup wizard sets `workspace_type='brand'` and `onboarding_completed=true`

**BP-046: Post Assignment**
- `AssignPost` dropdown with badge + button variants
- Team/Enterprise users auto-assigned to their own new posts (all creation paths updated)
- Auto-notifies assignee, logs to activity feed

**BP-047: Comments**
- Threaded comments with @mentions, resolve/unresolve toggle
- Rendered inside the right panel (tabbed with AI Assistant)

**BP-048: Activity Feed**
- `ActivityFeed` component with color-coded action icons
- `/activity` page for workspace-wide feed
- Per-post timeline rendered in the editor's right panel Activity tab
- Integrated into dashboard right column
- Activity logged on: post_created, post_edited (throttled 10min), post_status_changed, post_scheduled, post_published, post_archived, post_assigned, post_unassigned, post_commented, post_submitted_for_review, post_approved, post_changes_requested

**BP-049: Notifications Center**
- `NotificationsBell` in top bar (polls every 30s, unread badge)
- `/notifications` page with unread/all filter, delete, mark read
- Email delivery prep (email_enabled, email_queued_at, email_sent_at)

**BP-050: Approval Workflow with reviewer selection**
- `SubmitForReviewDialog` lets post author pick specific reviewers per submission
- Approval API accepts `reviewers[]` array, falls back to workspace.approval_stages config
- Status transition to "review" in workspace mode intercepts and opens dialog
- Full approval history card with reviewer names and decisions

**BP-051: Review Queue**
- `/workspace/reviews` page with 3 filter tabs (awaiting me / all pending / recently decided)
- Inline quick-approve / request-changes buttons

### Team Tier Gating
- All team collaboration UI (assignment, comments, approval, activity, review queue) gated to Team/Enterprise via `hasFeature(userTier, "workspaces")`
- Non-Team users see the original single-view AI Assistant panel (unchanged UX)
- Reviews nav item hidden for non-Team users

### Post Editor Right Panel Refactor
- Replaced `chatOpen: boolean` with `panelView: "ai" | "comments" | "activity" | null`
- Team users see a tabbed panel header with all three views
- Non-Team users see the original single-view AI Assistant panel
- Active tab persists to localStorage (`postpilot_panel_view`)
- Last-used view restored on next editor load

### Workspace Data Scoping
- New helpers: `applyWorkspaceFilter()` and `getActiveWorkspaceIdServer()` (cookie-based for server components)
- Individual mode: filter `workspace_id IS NULL AND user_id = current_user`
- Workspace mode: filter `workspace_id = active_workspace_id`
- Applied across Posts, Ideas, Calendar, Dashboard, Analytics
- Idea creation paths (CreateIdeaDialog, GenerateIdeasDialog) set workspace_id from active context

### RLS fix: workspace_members visibility
- Previous SELECT policy was `user_id = auth.uid()` — users could only see their own membership row
- This broke: members page (showed only self), reviewer dialog (empty), assignment dropdown (no teammates), mention autocomplete
- Fix: SECURITY DEFINER helper functions `is_workspace_member()` and `get_workspace_role()` (avoids recursion)
- New policies: any workspace member can see all members; owner/admin can update/delete; members can leave

### Workspace Members UI
- Role dropdown on each member row (owner/admin can change any non-owner role)
- Role descriptions panel with "Can review" badges on owner/admin/editor
- Fixed invite API: was inserting inviter as placeholder; now looks up invitee by email via admin.listUsers()

### Analytics Enhancements
- Renamed chart title to "Post Trends"
- Added Engagement/Impressions toggle (theme-primary active state)
- Date range selector: Last 7/30/90 days, Year to Date, All Time, Custom (with calendar icon toggle for from/to date picker)
- Aggregation dropdown (Daily/Weekly/Monthly/Quarterly/Yearly)
- Default: Last 30 days + Weekly aggregation
- Metrics above chart update to reflect date range filter
- Total Posts metric card added
- Sortable columns on All Tracked Posts table (impressions, reactions, comments, reposts, date posted)
- Pagination (default 5, view all, 25/page) on Top Posts and Pillar Performance; 25/page on All Tracked Posts
- Clickable rows with chevron indicator

### Admin Dashboard Polish
- Colored KPI cards with left borders and tinted icon circles (matches analytics page style)
- Usage Trends chart uses same date range selector + aggregation dropdown
- AI Usage page KPI cards colored (spend/requests/avg-cost/users/route/gateway/cache/success)
- Recent Signups filtered to last 30 days, capped at 10
- "View All" links on both Recent Signups and Trials Expiring Soon tables
- Admin users table trial column: progress bar + days remaining + trial start date + tier

### Database Migrations Applied
- `20260416_add_analytics_fetched_at.sql`
- `20260416_add_account_status.sql`
- `20260416_add_trial_fields.sql`
- `20260417_add_team_features.sql` (posts extensions + new tables)
- `20260418_fix_workspace_members_rls.sql`

### Backlog Updates
- BP-087 DONE
- BP-025 API prep done (deferred pending LinkedIn scope approval)
- BP-023, BP-046, BP-047, BP-048, BP-049, BP-050, BP-051 all DONE

---

## 2026-04-15 (Session 2): Announcements, Settings, Admin Charts

### Admin Announcements
- AI-powered draft generation using `createMessage` (non-streamed) with `verifyAdmin()` auth
- Preview button on each announcement card showing user-facing rendering
- Shared `ReleaseNotesContent` component extracted for reuse across admin preview and user modal
- Expandable text fields (resize-y) for Description, Features, Bug Fixes, Roadmap
- Fixed header overlap with theme toggle (added right padding)

### Release Notes Modal Improvements
- Version pills replace pagination arrows for browsing past announcements
- Pills use FilterPill styling pattern (primary color for active, border for inactive)
- Semantic version sorting ensures newest version is always first (leftmost pill)
- Supports external opening via `externalOpen` prop (used by Settings page)
- Stabilized fetch logic with `useRef` guard to prevent race conditions

### Settings Page
- New "Announcements" section with "View Release Notes" button opening the modal
- Reordered sections: Announcements, LinkedIn Posting, Appearance, AI Provider, Session

### Admin Dashboard - Usage Trends Chart
- Added "Day over Day" filter option to the period dropdown
- Fixed x-axis labels: Day ("Apr 15"), Week ("Mar 30"), Month ("Mar 2026"), Quarter ("Q1 2026"), Year ("2026")
- Rewrote `getUsageTrends` to query actual source tables (posts, ideas, ai_usage_events) instead of monthly usage_quotas aggregates, fixing the single-datapoint bug

---

## 2026-04-15: Tutorial SDK, BP-086, Calendar & Admin Improvements

### Tutorial SDK Phase 1 (Standalone Package)
- Built `@postpilot/tutorial-sdk` as standalone npm package in `packages/tutorial-sdk/`
- Set up npm workspaces monorepo structure
- Backend-agnostic architecture with adapter interfaces (LocalStorage + Supabase)
- Core engine: state machine with subscribe pattern, action detector (click/navigate/formInput/elementExists), 15s timeout timer
- Card templates: OverviewCard (media slot) + SimpleCard (minimal) with animated border beam effect (SVG stroke-dasharray animation using primary color)
- TutorialGate: first-login "Want a tour?" modal
- TutorialOverlay: CSS clip-path spotlight, element tracking, native pointer drag (replaces framer-motion drag)
- Tutorial chaining: `chainToTutorialId` field auto-starts next tutorial on completion
- Navigation awareness: tutorial auto-closes if user navigates away from the expected page
- Tutorial list slide-out: right-side panel on final cards showing all other tutorials
- Theming: CSS custom properties applied to document root (no wrapper div that breaks portals)
- Supabase tables: `tutorial_progress` + `tutorial_user_state` with RLS policies

### Tutorials Implemented (8 total)
1. **Full Application Overview** (4 steps) — sidebar nav, settings, theme/logout, chains to idea generation
2. **Dashboard Overview** (7 steps) — metrics, quick actions, drafts, recent ideas, usage, content balance, tutorial list
3. **Idea Bank Overview** (5 steps) — workflow, generator, filters, cards
4. **Posts Page Overview** (4 steps) — metrics, new post, filters, cards with action buttons
5. **Calendar Page Overview** (6 steps) — intro, grid with color coding, views, upcoming posts, card/list toggle
6. **System Management Overview** (3 steps) — settings (with BYOK note), help center, profile (navigates to each page)
7. **How to Generate Ideas with AI** (5 steps) — formInput detection for topic, click detection for Generate button, elementExists for generated ideas, manual save selection
8. **How to Develop an Idea into a Post** (10 steps) — navigate detection for Develop click, progress bar, AI draft, Apply to Editor, content editing, emojis/formatting, AI chat, hashtags, versions, publish

### Action Detector Improvements
- Multi-strategy detection: capture-phase event listeners + DOM polling (300ms) + MutationObserver
- `formInput` action: polls input value directly (handles React-controlled inputs), listens for input/change/keyup events, finds inputs inside wrapper components
- `elementExists` action: combines polling with MutationObserver for faster detection
- `navigate` action: supports prefix matching (e.g., `/posts` matches `/posts/abc-123`)
- All strategies share a single `complete()` function with fired-once guard

### BP-086: Show Directly Published Posts on Calendar
- New `publish_method` column on posts table: `'scheduled'` | `'direct'` | `'manual'`
- Migration with backfill for existing posted posts
- Publish API sets method based on whether `scheduled_for` was set
- Mark-posted-dialog and past-due-checker set `publish_method: 'manual'`
- Calendar query updated: `.or("scheduled_for.not.is.null,status.eq.posted")`
- `postsByDate` uses `scheduled_for ?? posted_at` as date key
- Upcoming Posts panel unchanged (forward-looking only, excludes posted)
- `PUBLISH_METHODS` constants with distinct colors (green/blue/teal)

### Calendar Improvements
- LinkedIn-style hover preview on post pills (author info, content preview, image, pillars)
- Conditional action buttons: Edit + Reschedule for scheduled, Edit + View on LinkedIn for posted
- Preview dialog (centered modal) with LinkedIn preview and conditional buttons
- Preview button added to Upcoming Posts card view
- Tour IDs added: `#tour-calendar-grid`, `#tour-upcoming-view-toggle`

### UI Polish
- Darker light theme background (`oklch(0.955)` from `0.98`), blue card glow (light + dark)
- Card images flush to top with overlaid status pills (dashboard, posts, calendar)
- Post preview sheet on calendar (replaces navigation)
- Card/list view toggle for Upcoming Posts
- Outlined Actions/Copy buttons, Idea Bank search borders, tag hint color
- Brainstorm: floating selection button replaces right-click context menu (restores native spelling)
- Engagement analytics moved from bottom of editor to below progress bar
- Tour IDs added across posts page, calendar, top bar, idea generator

### Admin Announcements
- AI-powered draft generation: reads `docs/ACTIVITY_LOG.md` and `docs/BACKLOG.md`
- New API endpoint `/api/admin/announcements/generate` using `createMessage` (non-streamed)
- Generates structured JSON: title, description, features, bug fixes, roadmap
- Admin reviews and edits before saving/publishing
- Uses `verifyAdmin()` for secure admin authentication (email whitelist)

### Backlog Items Added
- **BP-086:** Show Directly Published Posts on Calendar (completed)
- **BP-087:** Published Post View — separate `/posts/{id}/published` route for posted content analytics

### Known Bug — Auto-Draft Not Generating
- **Issue**: When developing an idea into a post, the AI should automatically generate an initial draft in the editor. This is not happening.
- **Status**: Documented for separate investigation. Not blocking tutorials.

### Removed from Editor
- "Start Initial Draft" button and "Use Template" picker removed from empty editor state

---

## 2026-04-11 (Evening): Idea Bank — Manual Entry + Tagging + Prioritization

Shipped both promised-but-missing Ideas page features in a single branch after merging the AI Gateway work to `develop`.

### BP-082: Manual Idea Entry
- New `CreateIdeaDialog` component (`src/components/ideas/create-idea-dialog.tsx`) with Title, Description, Content Pillar (optional), Priority, and Tags fields. Writes to `ideas` table with `source='manual'`, `status='captured'`.
- New "Add Idea" outline button on the Ideas page header, next to the primary "Generate Ideas" button.
- No AI calls, no quota impact — manual entry is always free.
- Available on all tiers.

### BP-083: Idea Tagging & Prioritization
- **Database:** `20260412_add_idea_priority.sql` adds `ideas.priority text CHECK (priority IN ('low','medium','high'))`. Nullable — "no priority" is a valid state.
- **Constants:** new `IDEA_PRIORITIES` object in `src/lib/constants.ts` with label/color/order for high/medium/low. Deliberately distinct from the removed temperature palette.
- **Reusable `<TagInput />` component** at `src/components/ui/tag-input.tsx`. Enter or comma commits a tag, Backspace on empty input removes last, × button removes any chip, case-insensitive dedupe, optional `maxTags` limit. No external library.
- **Ideas list page** (`src/app/(app)/ideas/page.tsx`):
  - New Priority filter row (All / High / Medium / Low / No Priority)
  - New Tags filter row — only rendered when at least one idea has tags; shows active filter chips; clicking a tag on any idea card adds it to the filter
  - `filteredIdeas` extended to AND status + priority + tags + search
  - `EditIdeaDialog` now includes Priority pill selector and `<TagInput />`
  - Idea cards show a color-coded Priority badge top-left when set; Status badge top-right; content pillars and tags in separate rows; tag chips are clickable to filter
  - "Clear filters" resets all filter state
- **Idea detail page** (`src/app/(app)/ideas/[id]/page.tsx`):
  - Priority selector with pill UI
  - Tag editor replaced with reusable `<TagInput />`
  - Priority badge in page header
  - Removed legacy `addTag`/`removeTag`/`newTag` state (dead code)
- **Process flow copy:** updated `src/components/ideas/idea-process-flow.tsx` step 2 from "Rate, tag, and prioritize" to "Tag and prioritize" (rating wasn't in scope).

### Verification
- `tsc --noEmit`: clean
- Lint on touched files: 0 errors, 0 warnings
- Manual end-to-end browser test:
  1. Clicked "Add Idea" → dialog opened with all fields
  2. Entered title + description, selected High priority, added `test-tag`
  3. Clicked Save → toast appeared, new idea at top of list
  4. DB row confirmed: `source='manual'`, `priority='high'`, `tags=['test-tag']`, `status='captured'`
  5. New idea card shows red **High Priority** badge + `test-tag` chip
  6. Tags filter row appeared once the idea had a tag
  7. Clicking the `test-tag` chip filtered list from 20 → 1
  8. Clicking High priority pill filtered list from 20 → 1 (same idea)
  9. Clicking Edit on the card opened EditIdeaDialog pre-filled with title, high priority pill active, tag chip visible
  10. Test idea deleted via SQL after verification

### Branch flow
- Merged `feature/ai-gateway-integration` into `develop` first as a clean unit (commit `65d0932`): 31 files, +2023/-557, brought in BP-076 through BP-081 and the BP-082/083/084 scoping docs.
- New branch `feature/ideas-tags-priority-manual` created from `develop` for this work.

### Files Modified
- New: `src/components/ui/tag-input.tsx`
- New: `src/components/ideas/create-idea-dialog.tsx`
- New: `supabase/migrations/20260412_add_idea_priority.sql`
- `src/lib/constants.ts` — added `IDEA_PRIORITIES` + `IdeaPriority` type
- `src/types/index.ts` — added `priority` field to `Idea` interface
- `src/app/(app)/ideas/page.tsx` — filter state, filter UI, card rendering, EditIdeaDialog, Add Idea button, CreateIdeaDialog mount
- `src/app/(app)/ideas/[id]/page.tsx` — priority selector, reusable TagInput, header badge
- `src/components/ideas/idea-process-flow.tsx` — step 2 copy update

---

## 2026-04-11: Settings Copy Polish, Collapsible UI Tightening, Idea Temperature Removal, Idea Bank Scoping, Tutorial Card Redesign Scoping

### Idea Bank Scoping (BP-082, BP-083)
- Scoped **manual idea entry** (BP-082) as a medium-priority feature. Ideas page copy promises manual entry but no UI exists today. Scoped as a lightweight `CreateIdeaDialog` with title/description/pillar fields that writes `source='manual'` to the existing ideas table — no schema changes required.
- Scoped **idea tagging and prioritization** (BP-083) to match the "Rate, tag, and prioritize your best ideas" copy on step 2 of the idea process flow. Includes a new `ideas.priority` column (low/medium/high, nullable), a reusable `<TagInput />` component, priority + multi-select tag filter rows on the Ideas page, and a click-tag-to-filter discovery pattern. Full mockups for the idea card, edit dialog, and filter bar included in the backlog entry, along with an end-to-end example user workflow for triaging freshly-brainstormed ideas.

### Tutorial Card Redesign Scoping (BP-084)
- Owner provided light and dark theme reference mockups for a redesigned tutorial card. Current card is solid-primary-blue with white text, compact header, small bottom progress bar, and no media slot.
- Scoped **BP-084 (high priority)** to replace the current card with a system-themed design: `bg-card` + border, top-left "STEP X OF Y" pill, top-right close button, prominent 16:9 media slot (image/gif/video + placeholder fallback), bold title, muted description, full-width primary CTA (`Next →` / `Finish`), and a `SKIP TUTORIAL` text link below.
- Added a new `media?: { type, src, alt?, poster? }` field to the `TutorialStep` schema so steps can optionally include visual content. Backwards compatible — existing steps render with a placeholder icon until media is added incrementally.
- Updated `docs/GUIDED-TOURS-REQUIREMENTS.md` to v1.1 with a full "Tutorial Card Visual Design" section containing the layout spec, theme rules, schema changes, and reference mockup paths (`docs/images/tutorial-card-light.png` and `docs/images/tutorial-card-dark.png` — owner to save the attached screenshots to those paths).
- BP-084 is scoped to the **visual redesign only**. The owner has flagged that the tutorial system overall is not functioning properly (state bugs, targeting issues) — those fixes are a separate future BP.

---

## 2026-04-11: Settings Copy Polish, Collapsible UI Tightening, Idea Temperature Removal

### Settings Page Copy (BP-079)
- Rewrote the Settings page intro and the AI Provider card description for non-technical readers. The AI Provider card now leads with "PostPilot includes built-in AI for everyone, so most users don't need to do anything here", names OpenAI and Anthropic by name instead of jargon, and treats "BYOK" as a side note rather than a feature name users need to learn.

### AI Provider Collapsibles (BP-080)
- Collapsed the Text AI Providers list by default (was always-open).
- Replaced the small uppercase muted-text section headers with bordered card-style buttons that include a section icon, label, a configured-count badge where applicable, and a chevron that flips on expand. Applies to all 3 collapsibles: Text AI Providers, Configure Text AI Provider Key, Image Generation Providers.
- All headers now expose `aria-expanded` for accessibility.

### Idea Temperature Removal (BP-081)
Removed the idea temperature feature (hot/warm/cold) entirely. It provided no clear product value and added UI clutter + extra AI constraints without helping users prioritize.

**Database:** `20260411_remove_idea_temperature.sql` drops `ideas.temperature` (was nullable text defaulting to `'warm'`). Applied via Supabase MCP.

**Code removed or simplified:**
- `src/types/index.ts` — removed `temperature` field from the `Idea` interface
- `src/lib/constants.ts` — deleted the `IDEA_TEMPERATURES` constant
- `src/lib/ai/prompts.ts` — removed the "CRITICAL — Temperature distribution" block and `suggestedTemperature` field from `BRAINSTORM_INSTRUCTIONS`. The brainstorm prompt now simply asks for a mix of timely/evergreen/niche angles without a formal taxonomy.
- `src/lib/tooltip-content.ts` — deleted `temperatureHot`, `temperatureWarm`, `temperatureCold` tooltip entries
- `src/app/api/ai/brainstorm/route.ts` — dropped `temperature` from the recent-ideas history select
- `src/components/ideas/generate-ideas-dialog.tsx` — removed temperature mapping and badge display
- `src/app/(app)/ideas/page.tsx` — removed temperature edit dialog, filter pills, filter state, card badge, and `tempFilter` state
- `src/app/(app)/ideas/[id]/page.tsx` — removed temperature state, select UI, save payload field, and header badge
- `src/app/(app)/dashboard/page.tsx` — removed `IDEA_TEMPERATURES` import, temperature from the recent ideas select, and the badge render
- `src/app/(app)/help/page.tsx`, `src/components/help-sidebar.tsx`, `src/lib/tutorials/tutorial-definitions.ts` — updated copy to drop mentions of the temperature feature

**Verification:**
- TypeScript `tsc --noEmit`: clean
- `grep -rn "temperature|IDEA_TEMPERATURES|tempFilter" src/` returns zero matches (AI model sampling temperature params were never used in the codebase)
- Dev server restarted with cleared Turbopack cache to flush stale compile errors
- `/dashboard`, `/ideas`, `/ideas/[id]`, `/settings` all return 200 with no console errors
- Ideas table schema confirmed: 11 columns, `temperature` removed

---

## 2026-04-10: Vercel AI Gateway Integration & AI Provider Settings Overhaul

### Phase 1: AI Gateway Core Integration (BP-076)
- **Evaluated Vercel AI Gateway** vs. current direct-to-provider implementation. Key benefits: unified billing for managed-access users, automatic provider fallbacks, prompt caching, per-project usage/spend tracking, zero markup on tokens, $5/mo free credits per Vercel team.
- **Zero-dependency approach:** reused existing `OpenAICompatibleClient` with a gateway `baseURL` override instead of installing the Vercel AI SDK. The gateway speaks OpenAI Chat Completions, so the existing streaming code path (SSE `data: {"text":"..."}`) works unchanged.
- **New helpers in `src/lib/ai/providers.ts`:**
  - `toGatewayModelId(provider, modelId)` maps `claude-sonnet-4-6` → `anthropic/claude-sonnet-4-6`
  - `createGatewayClient(provider, model)` returns an `AIClient` pointed at `https://ai-gateway.vercel.sh/v1`
  - `OpenAICompatibleClient` constructor extended with optional `baseURLOverride` and `defaultHeaders` params
- **Routing logic in `src/lib/ai/get-user-ai-client.ts`:** managed-access (non-BYOK) requests now route through the gateway when `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` is set. Falls back to direct `SYSTEM_AI_KEY_*` env vars if neither is configured.
- **OIDC token preferred over API key** in deployments — `VERCEL_OIDC_TOKEN` is auto-injected by Vercel and associates gateway requests with the PostPilot project in the gateway dashboard (fixes the "No Project" attribution issue). API key remains the fallback for local dev.
- **App attribution headers:** `x-title: PostPilot` and `http-referer` sent with every gateway request for observability + featured-app listings.
- **Routing logs** added: `[AI Gateway] FORCED {provider}/{model} via user setting` and `[AI Gateway] Routing {provider}/{model} via Vercel AI Gateway` for Vercel function log visibility.

### Phase 2: Force Gateway Toggle (BP-077)
- **New column:** `creator_profiles.force_ai_gateway` (boolean, default true) — testing/dev toggle that bypasses BYOK keys entirely and forces all AI requests through the gateway.
- **UI toggle** added to Settings > AI Provider card; writes to `force_ai_gateway` via `/api/settings/ai-provider` POST. Takes precedence over all BYOK key lookups in `getUserAIClient`.
- **Migration flipped all existing users to `force_ai_gateway = true`** so the gateway becomes the default routing path going forward. Users can opt back out via the toggle if they prefer direct BYOK.

### Phase 3: Settings Page Overhaul (BP-078)
- **Gateway toggle moved to the top of the AI Provider card** with user-friendly copy: *"Route AI requests through PostPilot's managed gateway for automatic provider fallbacks, unified billing, and the best reliability."*
- **Configured Text AI Providers list** now shows all 4 providers (Anthropic, OpenAI, Google, Perplexity) in a fixed order. Each row shows:
  - Green **Configured** badge when `tested_at` is set
  - Blue **Active** badge for the currently-selected provider
  - **Setup Provider** button for unconfigured providers (auto-expands the config form and selects the provider)
  - **Switch to** / Trash buttons for configured-but-inactive providers
- **Text AI key configuration form** is now collapsible (collapsed by default). Opens automatically when clicking Setup Provider.
- **New Image Generation Providers section** (collapsible, collapsed by default) for configuring dedicated image API keys. Writes to `ai_provider_keys` with `key_type='image'`, separate from text AI keys.
- **Tier gating:** entire BYOK config (everything below the gateway toggle) is gated to **Professional+**. Free and Creator tiers see the gateway toggle locked ON and an upgrade overlay with a link to /pricing.

### Phase 4: Database Schema Extensions
- **`ai_provider_keys` extended:**
  - New `key_type` column (`'text' | 'image'`, default `'text'`)
  - New `tested_at` column (nullable timestamptz) — set on successful key test, cleared on save
  - Replaced `UNIQUE(user_id, provider)` with `UNIQUE(user_id, provider, key_type)` so users can have separate text + image keys for the same provider
- **`creator_profiles.force_ai_gateway`** default changed from `false` to `true`, existing rows migrated.
- **All 3 existing provider keys** for the owner account correctly migrated to `key_type='text'`, `tested_at=null`.

### Phase 5: Backend API Updates
- **`/api/settings/provider-keys`** — all methods now accept a `keyType` query/body param (default `'text'`). Mutating endpoints (POST/DELETE/PATCH) enforce `hasFeature(tier, 'byok_ai_keys')`, returning 403 for Free/Creator tiers. GET still returns only safe metadata (`id, provider, key_type, is_active, tested_at, timestamps`) — no ciphertext.
- **`/api/settings/test-ai-key`** — persists `tested_at` on successful test. Accepts `keyType` param.
- **`/api/ai/generate-image`** — prefers `key_type='image'` keys in `ai_provider_keys`, falls back to `key_type='text'` if no image-specific key is configured. Added `[Image Gen]` routing logs.
- **`getProviderApiKey(provider, keyType?)`** — now keyType-aware. For `keyType='image'`, the legacy fallback correctly checks `creator_profiles.image_ai_*` columns instead of `ai_api_key_*`.
- **New feature gates** in `src/lib/constants.ts`: `byok_ai_keys: "professional"`, `byok_image_keys: "professional"`.

### Phase 6: Security Audit & Cleanup
- **Full security audit** of client-side data exposure. Findings:
  - ✅ RLS enabled with correct `auth.uid() = user_id` policies on `creator_profiles` and `ai_provider_keys` (verified via `pg_policies`)
  - ✅ No API route returns encrypted/ciphertext fields
  - ✅ No `NEXT_PUBLIC_*` env vars leak secrets; `ENCRYPTION_KEY`, `AI_GATEWAY_API_KEY`, `SYSTEM_AI_KEY_*` are all server-only
  - ✅ LinkedIn tokens decrypted server-side; only metadata returned to client
  - ✅ Admin `/api/admin/users` explicitly scrubs `ai_api_key_encrypted: undefined` before returning
  - ⚠️ **2 client components were fetching `ai_api_key_encrypted` directly via the browser Supabase client** (RLS-safe but best-practice violation). Fixed below.
- **`src/app/(app)/settings/managed-ai-status.tsx`:** removed `ai_api_key_encrypted` from the Supabase select. Uses `/api/settings/provider-keys?keyType=text` (safe metadata) to detect whether the user has a personal key.
- **`src/components/posts/generate-image-dialog.tsx`:** removed direct Supabase query for `ai_api_key_encrypted`. `loadConfig()` now fetches both text and image keys via the safe API route and builds the configured-provider list from metadata only.
- **Grep audit confirmed zero client components (`"use client"`) reference `api_key_encrypted` columns** after cleanup. All remaining references are in server components, server-only API routes, or type definitions.

### Database Migrations
- `20260410_force_ai_gateway.sql` — adds `creator_profiles.force_ai_gateway` boolean
- `20260410_extend_ai_provider_keys.sql` — adds `key_type` + `tested_at`, replaces unique constraint
- `20260410_default_force_ai_gateway_on.sql` — flips default to true and migrates existing users

### Files Modified
- `src/lib/ai/providers.ts` — gateway client factory, baseURL override, attribution headers
- `src/lib/ai/get-user-ai-client.ts` — gateway routing, force toggle, keyType-aware `getProviderApiKey`
- `src/lib/constants.ts` — new `byok_ai_keys` / `byok_image_keys` feature gates
- `src/app/api/settings/provider-keys/route.ts` — full rewrite for keyType support + tier gating
- `src/app/api/settings/test-ai-key/route.ts` — `tested_at` persistence + keyType support
- `src/app/api/settings/ai-provider/route.ts` — `forceAiGateway` field
- `src/app/api/ai/generate-image/route.ts` — image-type key preference
- `src/app/(app)/settings/page.tsx` — pass subscription tier + force-gateway to component
- `src/app/(app)/settings/ai-provider-settings.tsx` — major reorganization (~995 lines, 400+ lines changed)
- `src/app/(app)/settings/managed-ai-status.tsx` — security cleanup + unused import removal
- `src/components/posts/generate-image-dialog.tsx` — security cleanup of loadConfig
- `src/types/index.ts` — `force_ai_gateway` field on CreatorProfile

### Environment Variables Added (optional)
- `AI_GATEWAY_API_KEY` — team-scoped Vercel AI Gateway API key (local dev fallback)
- `VERCEL_OIDC_TOKEN` — auto-injected by Vercel in deployments (project-scoped attribution)
- `NEXT_PUBLIC_APP_URL` — optional, used for `http-referer` attribution header
- The existing `SYSTEM_AI_KEY_*` env vars are kept as a fallback and can be removed once gateway routing is proven stable across all environments.

### Cleanup & Housekeeping
- Removed unused `Check` import from `managed-ai-status.tsx`
- TypeScript `tsc --noEmit`: clean
- ESLint scoped to touched files: 0 errors, 0 warnings
- `depcheck` flagged `pdf-parse` as unused across all of `src/` — confirmed only appears in `node_modules`. Left in place for now; should be removed in a separate cleanup PR if the resume PDF feature is confirmed gone.

---

## 2026-04-07: Alpha Feedback Sprint - UX Overhaul, Tooltips, Workflow, AI Enhancements

### Phase 1: Quick Wins
- **No em dashes rule:** Added to AI GUARDRAILS, applies to all AI-generated content
- **Credit exhaustion UX:** Provider-specific billing links, friendly inline card in chat panel instead of raw error toasts
- **Scheduled status clarification:** Posts page, editor, and calendar now show "This post has not been published yet. It will be automatically published on [date] at [time]"

### Phase 2: Tooltip System & Post Card Actions
- **Centralized tooltip content map** (`src/lib/tooltip-content.ts`) with entries for all pages
- **TooltipWrapper component** with optional "Learn more" links that open help sidebar
- **Post card actions redesigned:** Single "Actions" dropdown replacing inline buttons; grouped sections with tooltips
- **"Mark as Posted" renamed to "Manually Posted"** with confirmation modal explaining the action
- **"Move to Review" gated to Team/Enterprise** via `review_status` feature gate
- **In Review metric card and tab** hidden for Free/Creator/Pro users
- **Product-wide tooltips** added to Ideas page, Library page, and Post editor
- **Help system expanded:** 4 new sections (Getting Started, Content Tools, AI Assistant, Scheduling)

### Phase 3: Workflow Improvements
- **Post progress bar:** Blue-themed horizontal stepper (Draft > Scheduled > Published) with timeline dates showing created_at, scheduled_at, and published_at
- **Review step** only shown for Team/Enterprise users
- **Reschedule:** ScheduleDialog accepts initialDate prop; Reschedule button in editor and Calendar page
- **Calendar hover preview:** Month view post pills show tooltip with content preview
- **Calendar upcoming posts:** Reschedule and Post Now buttons added
- **Idea process flow:** 3-step visualization at top of Ideas page (Generate > Filter > Develop)

### Phase 4: AI Enhancements
- **Deeper AI context:** Chat API now receives post status, content pillar, hashtags, and character count
- **Auto-draft from Idea Bank:** Developing an idea auto-triggers AI initial draft with idea description
- **New post toast:** "Your AI Assistant is ready to help" notification for posts created from scratch

### Phase 5: LinkedIn & Onboarding
- **LinkedIn auto-connect:** Automatically initiates posting OAuth after first login
- **Persistent LinkedIn banner:** Appears on ALL pages when disconnected; "Reconnect Now" button (no redirect to settings)
- **Content Tools onboarding step:** Introduces Content Library and Templates during setup
- **Subscription plan moved** from Settings page to Profile/Account page

### Phase 6: AI Cost Optimization
- **Model router** (`src/lib/ai/model-router.ts`): Task-based routing (simple/standard/complex) with cost tier indicators

### Additional Changes
- **Unified editor Actions dropdown:** Post to LinkedIn, Schedule Post, Manually Posted, View on LinkedIn, Revert to Draft, Revert to Review (Team+), Archive, Delete
- **Post to LinkedIn always opens preview dialog** to prevent accidental posting
- **Revert to Draft/Review** added for scheduled, past_due, and posted statuses
- **Scheduled card** uses purple color for consistency
- **Image version picker:** Thumbnail strip in editor and preview dialog for switching between image versions
- **Help sidebar:** Slide-out panel (non-modal, stays open while working) with article-based help system
- **Theme-colored glow** on all modals, dropdowns, and tooltips
- **Schedule button** added to publish preview dialog
- **`scheduled_at` column** added to posts table for progress bar timeline
- **Help content audit:** All articles updated for renamed actions, new features, and workflow changes

### Database Migration
- `posts.scheduled_at` (timestamptz) - tracks when the user scheduled the post

### New Files
- `src/lib/tooltip-content.ts` - Centralized tooltip text map
- `src/components/ui/tooltip-wrapper.tsx` - Reusable tooltip wrapper
- `src/components/posts/post-progress-bar.tsx` - Post workflow progress bar
- `src/components/ideas/idea-process-flow.tsx` - Idea workflow visualization
- `src/components/layout/linkedin-status-banner.tsx` - Persistent LinkedIn disconnect banner
- `src/components/help-sidebar.tsx` - Slide-out help panel with article registry
- `src/components/posts/image-version-picker.tsx` - Image history thumbnail strip
- `src/lib/ai/model-router.ts` - Task-based AI model routing

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
