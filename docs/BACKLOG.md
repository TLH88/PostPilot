# PostPilot - Product Backlog

> Last updated: 2026-04-01

## Status Key

| Status | Description |
|--------|-------------|
| Backlog | Identified, not yet started |
| In Progress | Currently being worked on |
| Done | Completed and deployed |

---

## Backlog Items

### BP-001: Release Notes Modal for Users

**Status:** Done
**Priority:** Medium
**Source:** User feedback
**Date Added:** 2026-03-16
**Completed:** 2026-03-16 (commits `8ea11d3`, `d948ace`)

**Description:**
Add a way to share what updates have been implemented in the latest release with users. A modal shown on login is the preferred approach.

**Requirements:**
- Display a "What's New" modal after login for each new release
- Track whether the user has seen the current release notes (`seen: true/false`)
- Only show the modal once per release per user
- Reset the `seen` flag when a new release is published
- Requires a release versioning/tracking mechanism (e.g., `app_releases` table with version, notes, date)
- Requires a `user_release_views` table to track which releases each user has dismissed

**Suggested Implementation:**
- Database: `app_releases` table (id, version, title, notes, published_at) + `user_release_views` table (user_id, release_id, seen_at)
- On login/dashboard load, check if the user has seen the latest release
- If not, show modal with release notes; on dismiss, mark as seen

---

### BP-002: Convert Post Versions into Separate Posts

**Status:** Done
**Priority:** Medium
**Source:** User feedback
**Date Added:** 2026-03-16
**Completed:** 2026-03-16 (commit `8ea11d3`)

**Description:**
Create a workflow that allows users to convert a saved post version into its own standalone post.

**Requirements:**
- Add an action to each version in the version dropdown (e.g., "Create as new post")
- Clicking the action creates a new post record with the version's title and content
- The new post should open in the post editor
- Original post and version remain unchanged

---

### BP-003: Mobile Help Page Access Without Losing Form State

**Status:** Done
**Priority:** High
**Source:** User feedback (active user pain point)
**Date Added:** 2026-03-16
**Completed:** 2026-03-16 (commit `8ea11d3`)

**Description:**
On mobile, when users click the help link from the onboarding form or settings page, the current page is closed/navigated away from. Users lose their progress (e.g., partially entered API key) and have to start over.

**Requirements:**
- Help page should open without destroying the user's current page state
- Options to explore:
  - Open help in a new browser tab (`target="_blank"`)
  - Show help content in a slide-over drawer or modal overlay
  - Add inline contextual help tooltips next to the API key field specifically
- Ensure the solution works well on mobile viewports

---

### BP-004: Fix Text Formatting Helpers (Bullets & Em Dashes)

**Status:** Done
**Priority:** High
**Source:** Bug report
**Date Added:** 2026-03-16
**Completed:** 2026-03-16 (commit `8ea11d3`)

**Description:**
Two bugs with the formatting insert buttons (Line break, Bullet point, Em dash) in the post content area:

**Bug 1 - Selected text is replaced:**
When the user highlights/selects text and clicks a formatting button (bullet or em dash), the selected text is deleted and replaced with just the formatting character. Expected behavior: the formatting character should be prepended to the selected text, not replace it.

**Bug 2 - Bullets don't persist on new lines:**
After inserting a bullet point and pressing Enter, the next line does not automatically get a bullet. Expected behavior: pressing Enter after a bulleted line should auto-insert a new bullet on the next line (similar to list behavior in text editors). Pressing Enter twice should exit bullet mode.

**Affected Code:**
- `src/app/(app)/posts/[id]/page.tsx` - `insertFormatting()` function and content change handler

---

### BP-005: Right-Click Context Menu to Brainstorm Selected Text as Post Topic

**Status:** Done
**Priority:** Low
**Source:** Feature request
**Date Added:** 2026-03-16
**Completed:** 2026-03-16 (commit `8ea11d3`)

**Description:**
Allow users to select any text in the post editor, right-click, and choose an option to brainstorm it as a new post topic.

**Requirements:**
- Add a custom context menu option: "Brainstorm as post topic" (appears when text is selected)
- Clicking the option should:
  1. Auto-save the user's current work
  2. Open the idea generator modal
  3. Pre-populate the idea generator text box with the selected text
  4. When the user clicks "Generate Ideas," the normal idea generation flow continues
- The custom context menu should integrate with or replace the browser's native context menu for the editor area

**Considerations:**
- Custom context menus require intercepting the `contextmenu` event
- Should only show the brainstorm option when text is actively selected
- May want to include other useful options in the context menu (copy, paste, formatting)

---

### BP-006: Fix Hashtag Double-Hash Display

**Status:** Done
**Priority:** High
**Source:** Bug report
**Date Added:** 2026-03-16
**Completed:** 2026-03-16

**Description:**
When AI suggests hashtags, they display with `##` (double hash) instead of `#`. The AI prompt returns hashtags with `#` prefix and the display component prepends another `#`.

**Fix:**
- Updated hashtag badge display to check if tag already starts with `#` before prepending

---

### BP-007: Improve Convert to Post Button Visibility & UX

**Status:** Done
**Priority:** High
**Source:** User feedback
**Date Added:** 2026-03-16
**Completed:** 2026-03-16

**Description:**
The "Convert to Post" button was hidden inside the version dropdown and only appeared after selecting a version. Users couldn't find it. Additionally, version selector dropdown didn't reflect which version was currently active.

**Fix:**
- Moved "Convert to Post" to a standalone button always visible next to "Save Version"
- Button works with current editor content (no version selection required)
- When a version is active, asks user if they want to delete the original version after conversion
- Version selector dropdown now shows the active version name in the trigger
- Active version is highlighted with a checkmark in the dropdown list

---

---

## Future Backlog (Phase 1: Monetization + Creator Tier)

### BP-015: Stripe Billing Integration

**Status:** Backlog
**Priority:** Critical
**Source:** Pricing strategy
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Integrate Stripe for subscription billing. Support Free, Creator ($19/mo), and Professional ($49/mo) tiers with monthly and annual billing (17% annual discount).

**Requirements:**
- Stripe Checkout for subscription creation
- Webhook handling for subscription lifecycle events (created, updated, canceled, payment failed)
- Subscription status stored in `creator_profiles` or new `subscriptions` table
- Customer portal link for self-service billing management

---

### BP-016: Usage Quota System

**Status:** Backlog
**Priority:** Critical
**Source:** Pricing strategy
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Enforce usage limits per tier: posts/month, brainstorms/month, AI chat messages/month, scheduled posts.

**Requirements:**
- `usage_quotas` table tracking monthly counts per user
- Quota check middleware before AI API calls and post creation
- Graceful degradation with upgrade prompts when limits are hit
- Monthly reset via cron or on-access check
- Free: 3 posts, 2 brainstorms, 20 chat messages, 2 scheduled
- Creator: unlimited posts, 15 brainstorms, 200 chat messages, 15 scheduled
- Professional: unlimited everything

---

### BP-017: Pricing Page

**Status:** Backlog
**Priority:** High
**Source:** Pricing strategy
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Public pricing page with tier comparison table, feature breakdown, FAQ, and Stripe Checkout integration.

---

### BP-018: Feature Gating Logic

**Status:** Backlog
**Priority:** High
**Source:** Pricing strategy
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Check user's subscription tier before allowing access to gated features. Show upgrade prompts for locked features.

---

### BP-019: Content Library

**Status:** Backlog
**Priority:** High
**Source:** Product evaluation (Creator tier value)
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Save and reuse hooks, CTAs, templates, and closing lines. "Save as template" button on any post section, "Insert from library" in the editor.

**Requirements:**
- New `content_library` table (type, text, pillar, tags, user_id)
- CRUD UI for browsing, searching, and managing saved content
- "Save to Library" action in post editor
- "Insert from Library" button in editor toolbar
- Creator tier and above only

---

### BP-020: Post Templates

**Status:** Backlog
**Priority:** High
**Source:** Product evaluation (Creator tier value)
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Pre-built post structures: story arc, hot take, how-to guide, listicle, question post, framework/model post. Creator tier and above.

---

### BP-021: Manual Analytics

**Status:** Backlog
**Priority:** Medium
**Source:** Product evaluation (Creator tier value)
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Self-report engagement numbers (likes, comments, reposts) on posted content. Track over time. Creator tier and above.

**Requirements:**
- Number input fields on posted posts
- Engagement history chart
- Content pillar performance comparison

---

### BP-022: Advanced Scheduling Suggestions

**Status:** Backlog
**Priority:** Low
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Show static best-time-to-post recommendations based on LinkedIn research data. Display in schedule dialog: "Best times: Tue-Thu 8-10am in your timezone."

---

## Future Backlog (Phase 2: Differentiation)

### BP-023: Brand/Team Onboarding Path

**Status:** Backlog
**Priority:** High
**Source:** Report feedback
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Add workspace type selector at onboarding start: "Individual Creator" vs "Brand/Team". Brand path captures: brand name, UVP, target audience personas, brand voice guidelines, sample content, content pillars.

---

### BP-024: Multi-User Workspaces

**Status:** Backlog
**Priority:** High
**Source:** Report feedback
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Invite team members via email, role-based access (Admin/Editor/Viewer). Posts belong to workspace. Publishing uses designated LinkedIn account. Professional tier only.

**Requirements:**
- `workspaces` table (id, name, type, owner_id, brand_profile)
- `workspace_members` table (workspace_id, user_id, role, invited_at)
- Posts get optional `workspace_id` column
- Invite flow via email
- Role-based UI visibility

---

### BP-025: LinkedIn API Analytics

**Status:** Backlog
**Priority:** Medium
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Read post engagement data from LinkedIn API. Requires `r_member_social` scope (restricted, needs LinkedIn approval). Alternative: CSV import from LinkedIn analytics export.

---

### BP-026: Trending Topics for Brainstorming

**Status:** Backlog
**Priority:** Medium
**Source:** UVP evaluation
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Inject trending industry news into brainstorm context via RSS feeds from industry blogs. Free option: rely on AI model's knowledge of current trends.

---

### BP-027: Voice Consistency Validation

**Status:** Backlog
**Priority:** Low
**Source:** UVP evaluation
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
After each draft, compare generated text against voice samples. Show tone score (0-100 match). Highlight phrases that deviate from creator's typical tone.

---

### BP-028: Guided Enhancement Workflows

**Status:** Backlog
**Priority:** Low
**Source:** UVP evaluation
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Replace generic "Enhance" with specific templates: "Add hook", "Make it story-driven", "Add social proof", "Improve CTA", each with a pre-built prompt.

---

## Future Backlog (Phase 3: Pro Tier)

### BP-029: Image Generation

**Status:** Backlog
**Priority:** Medium
**Source:** Report feedback
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Generate images for LinkedIn posts using DALL-E 3 via user's existing OpenAI BYOK key (~$0.04-0.08/image, zero cost to us). Professional tier only.

---

### BP-030: Approval Workflows

**Status:** Backlog
**Priority:** Medium
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Draft review/approve chain for teams. Editor submits for review, Admin approves or requests changes. Professional tier only.

---

### BP-031: Bulk Operations

**Status:** Backlog
**Priority:** Low
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Batch brainstorm (50 ideas at once), batch schedule, batch archive. Professional tier only.

---

### BP-032: A/B Testing for Hooks

**Status:** Backlog
**Priority:** Low
**Source:** UVP evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Generate multiple hook versions for the same post. Track which performs better via analytics. Professional tier only.

---

### BP-033: Content Pillar ROI Dashboard

**Status:** Backlog
**Priority:** Low
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Show which content pillars drive the most engagement. Requires analytics data (BP-021 or BP-025).

---

### BP-034: Past-Due Checker — Direct Publish Button

**Status:** Backlog
**Priority:** Medium
**Source:** LinkedIn integration follow-up
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Add "Publish Now" button to past-due checker dialog when user has active LinkedIn connection. Show `publish_error` if auto-publish failed.

---

### BP-035: Guided Tutorial — First Post Walkthrough

**Status:** Backlog
**Priority:** High
**Source:** Owner request
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Create an interactive guided tutorial that walks new users through onboarding, settings configuration, and creating their first post end-to-end. The tutorial should feel like a coach walking alongside the user, not a wall of text.

**Flow:**

1. **Dashboard Introduction** — After settings are configured, take the user to the dashboard. Explain what the dashboard shows (stats, recent activity, content pillar balance) and what actions they can take from here.

2. **Generate Ideas** — Guide the user to click the "Generate Ideas" button.
   - **Code fix required:** The dashboard "Generate Ideas" button currently just navigates to the Ideas Bank page. It needs to navigate to the Ideas Bank page AND auto-open the Idea Generator modal.

3. **Idea Generator Explanation** — Explain what the user can do in the Idea Generator modal: enter a topic, select a content pillar, and choose how many ideas to generate.
   - **Code fix required:** Make the topic field **mandatory** (currently optional).
   - **Code fix required:** Add an interactive "Help me choose" component — when the user is unsure what to post about, AI should ask a few questions based on the user's profile (expertise, audience, pillars) and suggest topics.

4. **View Generated Ideas** — After clicking "Generate Ideas," take the user back to the Ideas Bank to see the newly generated post ideas.

5. **Ideas Bank Overview** — Explain what they can see and do:
   - View all ideas with descriptions
   - Archive ideas they don't want
   - Choose to develop an idea into a post
   - Explain the temperature labels: **Hot** (timely/high-engagement), **Warm** (solid evergreen), **Cold** (niche but valuable)

6. **Develop an Idea** — Have the user choose a post idea and click the "Develop" button, taking them to the post editor.

7. **Post Editor Tour** — Explain each major section of the post editor page:
   - Title field
   - Content area with formatting toolbar (line break, bullet, em dash, copy post)
   - Character counter and hook indicator
   - Hook Analyzer
   - Hashtag section with AI suggestions
   - Status actions (Move to Review, Schedule, Post to LinkedIn)
   - Version management (Save Version, view/restore versions, Convert to Post)
   - AI Chat panel (right side)

8. **AI Drafting** — Explain how to use the AI to create the first draft:
   - Click "Start Initial Draft" or type a message in the AI chat
   - The AI uses their voice profile, pillars, and expertise to generate content
   - Explain the "Apply to Editor" button — clicking it replaces the editor content with the AI's suggestion

9. **Refine the Draft** — After the AI generates the first draft:
   - Explain the Hook Analyzer — click "Analyze Hook" to get feedback on the first ~210 characters
   - Explain versions — save different iterations, compare, restore, or convert a version into a new standalone post

10. **Publish** — Walk through the final steps:
    - Convert to Post (creates a clean copy for publishing)
    - If LinkedIn auto-posting is connected: click "Post to LinkedIn" to publish directly
    - If not connected: explain the clipboard copy option and manual posting
    - Show the "View on LinkedIn" link after successful posting

**Technical Approach:**
- Use a step-based overlay/tooltip system (e.g., react-joyride or custom implementation)
- Store tutorial progress in `creator_profiles` or `localStorage`
- Allow users to skip/dismiss the tutorial at any time
- Tutorial should be re-launchable from the Help page or Settings

**Sub-tasks requiring code changes before the tutorial can work:**
- [ ] Fix dashboard "Generate Ideas" button → navigate to Ideas Bank + auto-open generator modal
- [ ] Make brainstorm topic mandatory (not optional)
- [ ] Add AI-driven interactive topic suggestion component for unsure users
- [ ] Implement tutorial overlay/tooltip system
- [ ] Track tutorial completion state

---

### BP-036: Emoji Picker in Post Editor

**Status:** Backlog
**Priority:** Medium
**Source:** Owner request
**Date Added:** 2026-04-02
**Phase:** 1

**Description:**
Add an emoji picker to the post editor formatting toolbar so users can easily insert emojis into their LinkedIn posts without relying on OS-level emoji keyboards.

**Requirements:**
- Emoji picker button in the formatting toolbar row (next to line break, bullet, em dash, copy post)
- Searchable emoji grid (popular emojis, categories)
- Insert at cursor position in the content area
- Consider lightweight library (e.g., emoji-mart or native emoji picker)

---

### BP-037: Clarify Version Management & Convert to Post UX

**Status:** Backlog
**Priority:** High
**Source:** Owner request (user confusion)
**Date Added:** 2026-04-02
**Phase:** 1

**Description:**
The current "Convert to Post" button is confusing — users think it will publish their draft to LinkedIn. The version management and post conversion controls need to be separated and relabeled for clarity.

**Requirements:**
- Rename "Convert to Post" to something clearer (e.g., "Save as New Post" or "Create Standalone Post")
- Visually separate version management controls from publishing controls
- Add a tooltip or helper text explaining what "Convert to Post" does (creates a new standalone post from the current content/version)
- Ensure the "Post to LinkedIn" / "Publish to LinkedIn" button is the only action that implies LinkedIn publishing
- Consider moving version controls to a dedicated section or collapsible area to reduce toolbar clutter

---

### BP-038: Manual Post Status Change (Mark as Posted)

**Status:** Backlog
**Priority:** High
**Source:** Owner request
**Date Added:** 2026-04-02
**Phase:** 1

**Description:**
Users need the ability to manually change a post's status, particularly to mark a post as "Posted to LinkedIn" when they've posted it manually outside PostPilot. This is needed for posts that were shared via copy/paste or the manual LinkedIn share flow.

**Requirements:**
- Add status change options to the three-dot menu on the Posts list page
- Add status change options in the post editor (status area)
- Key transitions to support:
  - Any status → "Posted to LinkedIn" (sets posted_at, prompts for optional LinkedIn URL)
  - "Scheduled" → "Draft" (unschedule)
  - "Posted" → "Archived"
- When marking as posted, optionally allow user to paste the LinkedIn post URL
- Should update the post's `status`, `posted_at`, and optionally `linkedin_post_url`

---

## Completed Items

### BP-008: Hook Analysis Feature

**Status:** Done
**Priority:** High
**Source:** Product evaluation (Phase 0)
**Date Added:** 2026-04-01
**Completed:** 2026-04-01

**Description:**
Analyze the effectiveness of a LinkedIn post's hook (first ~210 characters visible before "see more"). Provides strength rating, technique identification, feedback, and improvement suggestions.

**Implementation:**
- New `/api/ai/analyze-hook` endpoint with Zod validation
- "Analyze Hook" button in post editor formatting toolbar
- Color-coded results card (green/yellow/red) with score, technique, and suggestion

---

### BP-009: History-Enhanced Brainstorming

**Status:** Done
**Priority:** High
**Source:** UVP evaluation (Phase 0)
**Date Added:** 2026-04-01
**Completed:** 2026-04-01

**Description:**
Brainstorm AI now receives context about the user's recent posts and ideas, avoiding topic repetition and prioritizing underserved content pillars.

**Implementation:**
- Modified `/api/ai/brainstorm` to query recent posts (15) and ideas (10)
- Injects content history, pillar distribution, and underserved pillars into AI context

---

### BP-010: Content Pillar Distribution Dashboard

**Status:** Done
**Priority:** Medium
**Source:** UVP evaluation (Phase 0)
**Date Added:** 2026-04-01
**Completed:** 2026-04-01

**Description:**
Visual breakdown of how content is distributed across the user's defined content pillars, with indicators for underserved pillars.

**Implementation:**
- New "Content Pillar Balance" card on dashboard
- Bar chart with percentage breakdown per pillar
- Yellow "needs content" indicator for pillars with zero posts

---

### BP-011: Copy Post to Clipboard

**Status:** Done
**Priority:** Medium
**Source:** Product evaluation (Phase 0)
**Date Added:** 2026-04-01
**Completed:** 2026-04-01

**Description:**
One-click copy of the post content and hashtags to the clipboard for easy pasting into LinkedIn.

**Implementation:**
- "Copy Post" button in post editor formatting toolbar
- Copies content + hashtags with proper LinkedIn formatting
- Success toast notification

---

### BP-012: QA Fixes — Input Validation & Error Logging

**Status:** Done
**Priority:** High
**Source:** QA audit (Phase 0)
**Date Added:** 2026-04-01
**Completed:** 2026-04-01

**Description:**
Add Zod input validation to all API routes, Zod response validation for AI outputs, structured error logging with API key redaction, and extract hardcoded constants.

**Implementation:**
- Created `src/lib/api-utils.ts` with shared Zod schemas and `logApiError()`
- Applied validation to all 5 AI routes + AI response parsing
- Extracted timeout and file size constants to `src/lib/constants.ts`

---

### BP-013: LinkedIn Direct Posting via API

**Status:** Done
**Priority:** Critical
**Source:** Product evaluation / roadmap
**Date Added:** 2026-04-01
**Completed:** 2026-04-01

**Description:**
Replace the manual "open LinkedIn in a new tab" share flow with direct API posting. Users connect their LinkedIn account once via OAuth (separate from login), then click "Publish to LinkedIn" to post directly without leaving PostPilot.

**Implementation:**
- Custom OAuth 2.0 flow requesting `w_member_social` scope (separate from Supabase OIDC login)
- New `src/lib/linkedin-api.ts` — LinkedIn API client (publish, token exchange, member ID lookup, refresh)
- 5 new API routes: `/api/linkedin/connect`, `/callback`, `/publish`, `/status`, `/disconnect`
- Encrypted token storage using existing AES-256-GCM (same pattern as AI API keys)
- Settings page "LinkedIn Posting" card with connect/disconnect/reconnect states
- Post editor updated: "Publish to LinkedIn" button calls API when connected, falls back to redirect if not
- "View on LinkedIn" link shown after successful posting
- Token expiry warnings (7-day threshold)
- DB migration: 9 new columns on `creator_profiles`, 4 new columns on `posts`

---

### BP-014: Scheduled Auto-Publishing via Supabase Edge Function

**Status:** Done
**Priority:** High
**Source:** Product evaluation / roadmap
**Date Added:** 2026-04-01
**Completed:** 2026-04-01
**Branch:** `develop`

**Description:**
Automatically publish scheduled posts to LinkedIn when their scheduled time arrives, without requiring the user to be online.

**Implementation:**
- Supabase Edge Function `publish-scheduled-posts` deployed at `supabase/functions/publish-scheduled-posts/index.ts`
- pg_cron job runs every minute, triggers Edge Function via `pg_net.http_post()`
- Edge Function queries posts where `status = 'scheduled'` and `scheduled_for <= now()`
- Decrypts LinkedIn tokens using AES-256-GCM (Deno Web Crypto API)
- Publishes via LinkedIn REST API, updates post status and stores LinkedIn URL
- Retry logic: up to 3 attempts, marks `past_due` on persistent failure
- Auth: HMAC-SHA256 JWT signature verification using project JWT secret
- Immediately stops retrying on 401/403 (expired token)
- Edge Function secrets: ENCRYPTION_KEY, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, JWT_SECRET

---

## Completed Items

- **BP-001:** Release Notes Modal for Users (2026-03-16)
- **BP-002:** Convert Post Versions into Separate Posts (2026-03-16)
- **BP-003:** Mobile Help Page Access Without Losing Form State (2026-03-16)
- **BP-004:** Fix Text Formatting Helpers - Bullets & Em Dashes (2026-03-16)
- **BP-005:** Right-Click Context Menu to Brainstorm Selected Text (2026-03-16)
- **BP-006:** Fix Hashtag Double-Hash Display (2026-03-16)
- **BP-007:** Improve Convert to Post Button Visibility & UX (2026-03-16)
- **BP-008:** Hook Analysis Feature (2026-04-01)
- **BP-009:** History-Enhanced Brainstorming (2026-04-01)
- **BP-010:** Content Pillar Distribution Dashboard (2026-04-01)
- **BP-011:** Copy Post to Clipboard (2026-04-01)
- **BP-012:** QA Fixes — Input Validation & Error Logging (2026-04-01)
- **BP-013:** LinkedIn Direct Posting via API (2026-04-01)
- **BP-014:** Scheduled Auto-Publishing via Edge Function (2026-04-01)
