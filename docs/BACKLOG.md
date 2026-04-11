# PostPilot - Product Backlog

> Last updated: 2026-04-11 (BP-085 scoped)

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

**Status:** Done
**Priority:** Critical
**Source:** Pricing strategy
**Date Added:** 2026-04-01
**Completed:** 2026-04-04
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

**Status:** Done
**Priority:** High
**Source:** Product evaluation (Creator tier value)
**Date Added:** 2026-04-01
**Completed:** 2026-04-03
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

**Status:** Done
**Priority:** High
**Source:** Product evaluation (Creator tier value)
**Date Added:** 2026-04-01
**Completed:** 2026-04-03
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

**Status:** Done
**Priority:** Low
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Completed:** 2026-04-03
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

**Status:** Done
**Priority:** Medium
**Completed:** 2026-04-03
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

**Status:** Done
**Priority:** High
**Source:** Owner request
**Date Added:** 2026-04-02
**Completed:** 2026-04-03
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

### BP-045: Third-Party Ad Integration (Free Tier)

**Status:** Backlog
**Priority:** Medium
**Source:** Owner request
**Date Added:** 2026-04-04
**Phase:** 1

**Description:**
Integrate a third-party ad network (e.g., Google AdSense) to display ads to free tier users. Paid tiers (Creator, Professional) are ad-free. Ad revenue supplements subscription revenue and helps offset infrastructure costs for free users.

**Requirements:**
- Ad slots in sidebar, dashboard, and between content sections for free tier users
- Ads hidden for Creator and Professional tier users (use existing `hasFeature` gating)
- Google AdSense or equivalent integration
- Responsive ad units that work on desktop and mobile
- Ad placements should not disrupt the core UX — no interstitials, no pop-ups
- Track ad impressions/revenue via the ad network dashboard

---

## Team & Enterprise Backlog (Phase T1–T4)

### BP-046: Post Assignment & Ownership

**Status:** Backlog
**Priority:** High
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T1

**Description:**
Assign posts to specific team members. Posts show who's working on them. "My Assignments" filter view.

**Requirements:**
- Add `assigned_to`, `assigned_by`, `assigned_at` columns to posts table
- "Assign to" dropdown in post Actions menu (lists workspace members)
- Assignee avatar/name badge on post cards
- "My Assignments" filter tab on Posts page
- Dashboard: "Assigned to Me" section in workspace mode

---

### BP-047: In-App Comments on Posts

**Status:** Backlog
**Priority:** High
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T1

**Description:**
Threaded comments on any post. @mention teammates. Resolve comments when addressed.

**Requirements:**
- New `post_comments` table (id, post_id, user_id, content, parent_id for threads, resolved, resolved_by, timestamps)
- Comment panel in post editor (collapsible section)
- Comment count badge on post cards
- @mention autocomplete from workspace members
- Resolve/unresolve toggle per comment thread

---

### BP-048: Activity Feed

**Status:** Backlog
**Priority:** High
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T1

**Description:**
Real-time feed showing team activity: who did what, when.

**Requirements:**
- New `activity_log` table (id, workspace_id, user_id, post_id, action, details jsonb, created_at)
- Activity feed in dashboard right column (workspace mode)
- Per-post activity timeline in post editor
- Actions tracked: created, edited, commented, assigned, status_changed, approved, published

---

### BP-049: Notifications Center

**Status:** Backlog
**Priority:** High
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T1

**Description:**
In-app notifications for assignments, mentions, approvals, comments, deadlines.

**Requirements:**
- New `notifications` table (id, user_id, workspace_id, type, title, body, post_id, read, created_at)
- Bell icon in top bar with unread count badge
- Dropdown panel with recent notifications
- Click → navigate to relevant post
- Mark as read / mark all as read

---

### BP-050: Configurable Approval Workflow

**Status:** Backlog
**Priority:** Critical
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T2

**Description:**
Posts must go through defined approval stages before publishing. Workspace owner configures required stages.

**Requirements:**
- New `post_approvals` table (id, post_id, stage, reviewer_id, decision, feedback, version_id, created_at)
- Add `approval_stage` to posts, `approval_stages` jsonb to workspaces
- New post statuses: `approved`, `changes_requested`
- "Submit for Review" / "Approve" / "Request Changes" buttons
- Review feedback form with version reference

---

### BP-051: Review Queue

**Status:** Backlog
**Priority:** High
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T2

**Description:**
Dedicated view for reviewers to see all posts awaiting their approval.

**Requirements:**
- New `/workspace/reviews` page
- Filter: awaiting my review, all pending, recently approved
- Quick approve/request changes inline
- Badge count in sidebar nav
- Side-by-side version diff view

---

### BP-052: Brand Consistency Scoring

**Status:** Backlog
**Priority:** Medium
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T3 (consider pulling forward as differentiator)

**Description:**
AI checks posts against brand voice guidelines before publishing. Shows alignment score.

**Requirements:**
- New API route `/api/ai/brand-check`
- Sends post content + workspace brand_voice_guidelines + brand_content_pillars to AI
- Returns score (0-100), flags, suggestions
- Score badge on post card and in editor
- Only runs for workspace posts

---

### BP-053: Content Briefs

**Status:** Backlog
**Priority:** Medium
**Source:** Team feature scoping
**Date Added:** 2026-04-04
**Phase:** T3

**Description:**
Create briefs before posts are written. Assign to writers with topic, key points, audience, deadline.

**Requirements:**
- New `content_briefs` table
- Briefs list page at `/workspace/briefs`
- "Start from Brief" option when creating new post
- Brief status tracking (open, in_progress, completed)

---

### BP-054: Managed AI Access — System Keys & Trial Access

**Status:** Done
**Priority:** Critical
**Completed:** 2026-04-04
**Source:** Owner request (alpha/beta testing, trial experience)
**Date Added:** 2026-04-04
**Phase:** 1

**Description:**
Provide system-level AI access to free/trial users without requiring them to configure their own API keys. New accounts auto-receive 14-day managed AI access. Admin can manually grant/revoke per user.

**Requirements:**
- **Database:** Add `managed_ai_access` (boolean, default true) and `managed_ai_expires_at` (timestamptz, default now+14 days) to `creator_profiles`
- **Environment:** System-level API keys as env vars (`SYSTEM_AI_KEY_OPENAI`, `SYSTEM_AI_KEY_ANTHROPIC`, `SYSTEM_AI_KEY_GOOGLE`, `SYSTEM_AI_KEY_PERPLEXITY`)
- **AI Client:** Update `get-user-ai-client.ts` fallback chain: user's personal key → managed system key (if flag=true and not expired) → error
- **Onboarding:** Auto-set managed_ai_access=true + expires_at=now()+14 days on new profile creation
- **Settings UI:** Show "Trial AI Access" badge with expiry countdown when using managed keys. Show "Add your own API key" prompt when trial is expiring.
- **Security:** System keys never exposed to browser — server-side only. User quotas still enforced.
- **Admin:** Manual grant/revoke via Supabase (future: admin panel)
- **Onboarding flow:** Skip the API key setup step when managed access is active — user can go straight to creating content

---

### BP-055: Managed AI Access — Settings & Onboarding UX

**Status:** Done
**Priority:** High
**Completed:** 2026-04-04
**Source:** Owner request
**Date Added:** 2026-04-04
**Phase:** 1

**Description:**
Update the Settings page and onboarding flow to reflect managed AI access status.

**Requirements:**
- Settings: "AI Access" card showing current source (Trial / Personal Key / Expired)
- Trial countdown: "X days remaining" with progress bar
- "Upgrade" CTA when trial is expiring or expired
- Onboarding: AI key step becomes optional when managed access is active (show "Skip — you have trial access" option)
- Help text explaining BYOK vs managed access

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

### BP-039: Add Image to LinkedIn Post Before Publishing

**Status:** Done
**Priority:** High
**Completed:** 2026-04-03
**Source:** Owner request
**Date Added:** 2026-04-03
**Phase:** 1

**Description:**
Update the "Post to LinkedIn" workflow to allow users to optionally attach an image to their post before it is published. Currently, posts are published as text-only. LinkedIn posts with images get significantly higher engagement.

**Requirements:**
- Add an image upload step/preview in the publish-to-LinkedIn flow (before the post is sent)
- Support common image formats (JPG, PNG, GIF) within LinkedIn's size limits
- Show image preview with option to remove before publishing
- Update `/api/linkedin/publish` to use LinkedIn's image upload API (`/rest/images` → register upload → upload binary → attach to post)
- Update the Supabase Edge Function (`publish-scheduled-posts`) to support image attachments for scheduled posts
- Store uploaded image reference on the `posts` table (e.g., `image_url` or `image_storage_path`)
- Consider using Supabase Storage for image hosting
- Graceful fallback: if image upload fails, prompt user to publish text-only or retry
- Image should also be visible in the post editor preview

---

### BP-040: Fix Dashboard "New Post" Button Navigation

**Status:** Done
**Priority:** High
**Source:** Bug report (Owner)
**Date Added:** 2026-04-03
**Completed:** 2026-04-03
**Phase:** 1

**Description:**
The "New Post" button on the dashboard currently navigates to the Posts list page instead of opening the post editor with a new blank post. Users expect clicking "New Post" to immediately start creating a new post.

**Requirements:**
- Dashboard "New Post" button should create a new post record and navigate directly to the post editor (`/posts/[new-id]`)
- Match the behavior of however new posts are created elsewhere in the app (e.g., from Ideas Bank "Develop" button)
- If post creation requires a minimum set of data, pre-populate with sensible defaults (e.g., status: draft, untitled)

---

### BP-041: Requirements Spec — In-App Image Generation & LinkedIn Image Publishing

**Status:** Done
**Priority:** Medium
**Completed:** 2026-04-03
**Source:** Owner request (feeds into BP-029)
**Date Added:** 2026-04-03
**Phase:** 2

**Description:**
Flesh out the full requirements for in-app AI image generation (BP-029) and how generated/uploaded images will be attached to posts and published to LinkedIn. This is a design/requirements task, not implementation.

**Requirements to Define:**
- **Image generation flow:** Where in the post editor does the user trigger image generation? What prompts/options are available? How does the AI use post content to suggest an image?
- **BYOK integration:** How does this work with the user's existing OpenAI key (DALL-E 3)? What about users on Claude/Gemini/Perplexity who don't have an OpenAI key?
- **Image storage:** Where are generated images stored? (Supabase Storage bucket, external CDN, etc.) Retention policy? Storage limits per tier?
- **Image-to-post association:** Data model for linking images to posts (one image per post? multiple? carousel support?)
- **LinkedIn publishing with images:** Full API flow for publishing a post with an attached image (register upload → upload binary → create post with media). How does this integrate with both direct publish and scheduled auto-publish?
- **Image editing/regeneration:** Can users regenerate, crop, or swap images before publishing?
- **Tier gating:** Which tiers get image generation vs. image upload only?
- **Cost transparency:** Show users estimated cost per image generation ($0.04–0.08 via DALL-E 3)
- **Output:** A detailed spec document that can be used to implement BP-029 and update BP-039

---

### BP-044: Publish to LinkedIn Preview & Confirmation Flow

**Status:** Done
**Priority:** High
**Source:** Owner request
**Date Added:** 2026-04-03
**Completed:** 2026-04-03
**Phase:** 1

**Description:**
Clicking any "Publish to LinkedIn" button anywhere in the system should open the post in a preview/confirmation dialog before sending it to LinkedIn. Currently, clicking publish sends the post immediately with no chance to review.

**Requirements:**
- Intercept ALL "Publish to LinkedIn" triggers system-wide (post editor, past-due checker, and any future publish entry points)
- Show a preview dialog that displays the post exactly as it will appear on LinkedIn (reuse/extend the existing `LinkedInPreview` component)
- Preview dialog provides four actions:
  1. **Approve & Publish** — sends the post to LinkedIn as-is
  2. **Add/Replace Image** — allows user to attach or swap an image before publishing (ties into BP-039 image upload feature)
  3. **Open in Editor** — navigates to the post editor for further edits, cancels the publish flow
  4. **Cancel** — closes the dialog, no action taken
- The dialog should show the post title (prepended), content, and hashtags as they will appear in the LinkedIn feed
- Loading state on "Approve & Publish" while the API call is in progress
- On success: show toast with "View on LinkedIn" link, same as current behavior

**Implementation Notes:**
- Create a shared `PublishPreviewDialog` component that wraps the publish API call
- All publish triggers pass `postId` to the dialog instead of calling `/api/linkedin/publish` directly
- The "Add/Replace Image" action can be a stub/placeholder until BP-039 (image upload) is implemented
- Consider whether the dialog should fetch fresh post data or accept it as props

---

### BP-042: Include Post Title in LinkedIn Publish & Preview

**Status:** Done
**Priority:** High
**Source:** Owner request
**Date Added:** 2026-04-03
**Completed:** 2026-04-03
**Phase:** 1

**Description:**
The post title is not currently included when a post is published to LinkedIn or shown in the LinkedIn preview. The title should be prepended to the post content (e.g., as a bold first line) so it appears as part of the published post on LinkedIn.

**Requirements:**
- When publishing to LinkedIn (both direct publish via `/api/linkedin/publish` and scheduled auto-publish via Edge Function), prepend the post title to the content body
- Update the LinkedIn Preview component to show the title integrated into the post content, matching how it will appear on LinkedIn
- Handle edge cases: no title set, title duplicates first line of content
- Ensure "Copy Post" clipboard action also includes the title
- Define formatting: title as first line followed by a blank line, or title in bold unicode characters, etc.

---

### BP-043: Investigate & Fix Frequent LinkedIn Disconnections

**Status:** Done
**Priority:** Critical
**Source:** Owner report (recurring issue)
**Date Added:** 2026-04-03
**Completed:** 2026-04-03
**Phase:** 1

**Description:**
The system frequently loses its connection to LinkedIn, requiring users to manually reconnect. This disrupts the posting workflow and undermines trust in scheduled auto-publishing. Needs investigation to determine root cause and implement a fix.

**Investigation Areas:**
- **Token expiry:** LinkedIn access tokens expire after 60 days. Are tokens expiring sooner than expected? Is the expiry being tracked/stored correctly?
- **Token refresh:** Is there a refresh token flow implemented? LinkedIn's OAuth 2.0 supports refresh tokens — verify if we're requesting and using them
- **Encryption/decryption:** Could token storage or retrieval (AES-256-GCM) be silently failing, causing the app to think the connection is lost?
- **Status check logic:** Review `/api/linkedin/status` — is it incorrectly reporting disconnected status? Are there edge cases (e.g., network timeouts) being treated as disconnections?
- **LinkedIn API errors:** Check if 401/403 responses from LinkedIn are triggering token deletion. Should we distinguish between "token expired" and "temporary API error"?
- **Edge Function impact:** Is the scheduled publishing Edge Function consuming or invalidating tokens?

**Requirements (after investigation):**
- Implement token refresh flow if not already present
- Add token expiry warning UI (e.g., "Your LinkedIn connection expires in X days — reconnect now")
- Improve error handling to distinguish temporary API errors from actual token invalidation
- Add logging/telemetry to track disconnection events and their causes
- Consider proactive token refresh before expiry

---

### BP-076: Vercel AI Gateway Integration

**Status:** Done
**Priority:** High
**Source:** Owner strategic decision
**Date Added:** 2026-04-10
**Completed:** 2026-04-10

**Description:**
Route managed-access (non-BYOK) AI requests through the Vercel AI Gateway instead of directly to provider APIs. Gives us unified billing, automatic provider fallbacks, prompt caching, per-project usage tracking, and zero markup on tokens. $5/mo free credits per Vercel team help offset the system-key cost for Free/Creator trial users.

**Requirements:**
- Route all managed AI access requests through `https://ai-gateway.vercel.sh/v1` when `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` is configured
- Fall back to direct `SYSTEM_AI_KEY_*` env vars if the gateway is not available (local dev)
- Model IDs must be converted to gateway format (`provider/model-id`) on the fly
- Frontend SSE streaming format (`data: {"text":"..."}`) must remain unchanged
- Image generation excluded from gateway in Phase 1 — provider-specific image APIs still go direct
- Must be zero new dependencies (reuse existing `openai` SDK, not the Vercel AI SDK)

**Implementation:**
- New `createGatewayClient(provider, model)` factory and `toGatewayModelId` helper in `src/lib/ai/providers.ts`
- `OpenAICompatibleClient` constructor extended with optional `baseURLOverride` and `defaultHeaders`
- `src/lib/ai/get-user-ai-client.ts` managed-access fallback branch now routes through the gateway when configured
- Prefers `VERCEL_OIDC_TOKEN` over `AI_GATEWAY_API_KEY` in deployments for project-scoped attribution
- Sends `x-title: PostPilot` and `http-referer` headers for app attribution

---

### BP-077: Force AI Gateway Toggle

**Status:** Done
**Priority:** Medium
**Source:** Testing need
**Date Added:** 2026-04-10
**Completed:** 2026-04-10

**Description:**
Add a user-facing toggle in Settings that forces all AI requests through the Vercel AI Gateway, bypassing any configured BYOK keys. This supports testing gateway routing without removing existing keys, and allows users to opt into the managed gateway experience even when they have their own keys saved.

**Requirements:**
- New `creator_profiles.force_ai_gateway` boolean column (default `true`)
- Existing users migrated to `force_ai_gateway = true`
- Toggle in Settings > AI Provider card that calls `/api/settings/ai-provider` POST with `forceAiGateway` field
- When `true`, the gateway routing check takes precedence over all BYOK key lookups in `getUserAIClient`
- Server-side routing log: `[AI Gateway] FORCED {provider}/{model} via user setting`
- Toggle is locked ON for Free/Creator tiers (they cannot opt out)

---

### BP-078: AI Provider Settings Card Overhaul

**Status:** Done
**Priority:** High
**Source:** Owner UX request
**Date Added:** 2026-04-10
**Completed:** 2026-04-10

**Description:**
Reorganize the AI Provider card in Settings around the new gateway-first flow. Move the gateway toggle to the top, reorganize configured providers as a first-class list with Setup Provider / Switch to / Configured states, make the text AI key form collapsible, add a new collapsible Image Generation Providers section for dedicated image keys, and gate all BYOK configuration to Professional+.

**Requirements:**
- Gateway toggle at the top with user-friendly copy describing the function
- Configured Text AI Providers list shows all 4 providers (Anthropic, OpenAI, Google, Perplexity); row shows Setup Provider / Switch to / Configured badges based on state
- Text AI key configuration form is collapsible (collapsed by default), auto-opens when clicking Setup Provider
- New collapsible Image Generation Providers section with its own provider/model/key form; stores keys with `key_type='image'`
- Free and Creator tiers see the gateway toggle locked ON and an upgrade overlay covering the rest of the card; BYOK available on Professional+
- Persist "tested" state via a new `tested_at` column on `ai_provider_keys` so users can see which providers have been validated across sessions
- Security: no ciphertext columns fetched client-side

**Implementation:**
- Database: `ai_provider_keys` extended with `key_type` + `tested_at`, new composite unique constraint `(user_id, provider, key_type)`
- New feature gates `byok_ai_keys: "professional"` and `byok_image_keys: "professional"`
- `/api/settings/provider-keys` accepts `keyType` query/body param on all methods, enforces tier gating on mutating endpoints
- `/api/settings/test-ai-key` persists `tested_at` on successful test
- `/api/ai/generate-image` prefers `key_type='image'` keys with fallback to text keys
- Full rewrite of `src/app/(app)/settings/ai-provider-settings.tsx`

**Related Security Cleanup:**
- `src/app/(app)/settings/managed-ai-status.tsx`: stopped fetching `ai_api_key_encrypted` from the browser; uses `/api/settings/provider-keys` metadata instead
- `src/components/posts/generate-image-dialog.tsx`: stopped fetching `ai_api_key_encrypted` from the browser; `loadConfig` now uses the safe API route
- Verified zero client components reference ciphertext columns after cleanup
- Verified RLS enabled with proper `auth.uid() = user_id` policies on `creator_profiles` and `ai_provider_keys` via `pg_policies`

---

### BP-079: Settings Copy Rewrite for Non-Technical Readers

**Status:** Done
**Priority:** Low
**Source:** Owner UX request
**Date Added:** 2026-04-11
**Completed:** 2026-04-11

**Description:**
Rewrote the Settings page intro and AI Provider card description so a person who may not know what an API key is can still understand what the card does. The AI Provider card now leads with "built-in AI for everyone, so most users don't need to do anything here", names concrete brands (OpenAI, Anthropic), and treats "BYOK" as a side note rather than a feature name.

---

### BP-080: AI Provider Settings Collapsible Polish

**Status:** Done
**Priority:** Low
**Source:** Owner UX request
**Date Added:** 2026-04-11
**Completed:** 2026-04-11

**Description:**
Collapse the Text AI Providers list by default and make all 3 collapsible sections visually distinct from plain labels. Replaced the small uppercase muted-text headers with bordered card-style buttons that include section icons, labels, configured-count badges, and a chevron that flips on expand. Added `aria-expanded` to all collapsible triggers for accessibility.

---

### BP-081: Remove Idea Temperature Feature

**Status:** Done
**Priority:** Medium
**Source:** Owner decision (no observed product value)
**Date Added:** 2026-04-11
**Completed:** 2026-04-11

**Description:**
Removed the idea temperature feature (hot/warm/cold categorization) from the entire system. It added UI clutter and required an unnecessary taxonomy without helping users prioritize.

**Scope:**
- Database: dropped `ideas.temperature` column (nullable text, default `'warm'`, 30 rows) via migration `20260411_remove_idea_temperature.sql`
- Types: removed `temperature` field from the `Idea` interface
- Constants: deleted `IDEA_TEMPERATURES` constant
- AI prompt: removed "Temperature distribution" block and `suggestedTemperature` field from `BRAINSTORM_INSTRUCTIONS`. Replaced with a single line asking the AI to vary timely/evergreen/niche angles without a formal taxonomy.
- Tooltips: removed `temperatureHot` / `temperatureWarm` / `temperatureCold` entries
- UI: removed temperature filters, badges, edit selectors, and all `IDEA_TEMPERATURES` imports across Ideas page, idea detail page, generate-ideas-dialog, and dashboard
- Docs/tutorials: updated help page, help sidebar, and tutorial definitions to drop temperature mentions

**Verification:**
- `tsc --noEmit`: clean
- `grep -rn "temperature|IDEA_TEMPERATURES|tempFilter" src/`: zero matches
- All affected pages (`/dashboard`, `/ideas`, `/ideas/[id]`, `/settings`) return 200 with no console errors after Turbopack cache flush
- Ideas table schema confirmed to have 11 columns (temperature removed)

---

### BP-082: Manual Idea Entry

**Status:** Done
**Priority:** Medium
**Source:** Owner observation — Ideas page description promises manual entry but no UI exists
**Date Added:** 2026-04-11
**Completed:** 2026-04-11

**Problem:**
The Ideas page description at `src/app/(app)/ideas/page.tsx` says *"Click 'Generate Ideas' to brainstorm with AI, or add your own manually."* — but there is no "Add Idea" button. The only way to add an idea today is through the AI brainstorm dialog. Users who jot down ideas on their phone, hear something in a podcast, or want to capture a raw thought have no way to enter it without invoking the AI.

**Requirements:**
- Add an **"Add Idea"** button to the Ideas page header row (next to "Generate Ideas"). Secondary/outline variant so it doesn't compete with the primary AI action.
- Clicking opens a lightweight modal dialog with these fields:
  - **Title** (required, text, max ~150 chars)
  - **Description** (optional, textarea, no hard limit — same as AI-generated ideas)
  - **Content Pillar** (optional, single-select from the user's configured pillars — same pattern as the current Generate Ideas dialog)
  - **Tags** (optional) — *deferred until BP-083 ships a reusable tag input component; ship without tags first if BP-083 isn't ready*
- On save:
  - Insert into `ideas` table with `source: 'manual'`, `status: 'captured'`, `workspace_id` from current context
  - Close dialog, add the new idea to the in-memory list (optimistic), show success toast
  - Keep the user on the Ideas page (no redirect)
- No AI calls, no quota impact — manual entry is always free
- Same validation as the existing `EditIdeaDialog` (title required and non-empty after trim)

**Implementation Notes:**
- **Reusable pattern:** extend the existing `EditIdeaDialog` component (`src/app/(app)/ideas/page.tsx:138-214`) or create a sibling `CreateIdeaDialog`. The existing dialog only handles title + description — a new form needs content pillar selection too. Recommended to create a new `CreateIdeaDialog` component in `src/components/ideas/create-idea-dialog.tsx` so the Add and Edit flows can diverge cleanly.
- **Button row:** The current "Generate Ideas" button lives at `src/app/(app)/ideas/page.tsx:408-413`. Add the new button immediately to its left with `variant="outline"` and a `Plus` icon.
- **DB insert:** Mirror the shape of the current `handleSaveIdea` in `generate-ideas-dialog.tsx:206-216` but with `source: 'manual'` and whatever the user entered. `tags: []` and `content_pillars: []` are both safe defaults.
- **No schema changes needed** — the ideas table already supports all fields this feature needs.
- **Telemetry:** track `source='manual'` count in admin/usage dashboards if that becomes useful later (not required for MVP).

**Tier gating:**
- Available on all tiers. Manual entry has zero cost to us and should never be locked behind a paywall.

**Acceptance:**
1. An "Add Idea" button is visible next to "Generate Ideas" on the Ideas page
2. Clicking it opens a modal with Title, Description, and Content Pillar fields
3. Saving creates an idea with `source='manual'`, `status='captured'`, visible in the list immediately
4. Closing/cancelling discards the form with no DB write
5. Works for both personal and workspace users (respects current `workspace_id` context)

---

### BP-083: Idea Tagging & Prioritization

**Status:** Done
**Priority:** Medium
**Source:** Owner observation — process flow step 2 promises "Rate, tag, and prioritize" but no such features exist
**Date Added:** 2026-04-11
**Completed:** 2026-04-11

**Problem:**
The `IdeaProcessFlow` component (`src/components/ideas/idea-process-flow.tsx:21`) promises users can *"Rate, tag, and prioritize your best ideas"* in step 2 of the workflow. None of those things exist today:

- **Rate/prioritize:** no column, no UI, no concept in the codebase
- **Tag:** a `tags text[]` column exists and is populated by AI brainstorm occasionally, but there is no way to view, edit, filter, or add tags from the UI. The copy is currently aspirational.

This is a trust gap — the feature walkthrough describes something we don't deliver.

**Scope:**
Deliver a working tag and priority system for ideas that matches the process flow copy, including:
1. A priority column + UI (3-level enum: Low / Medium / High)
2. A tag editor + filter on the Ideas page
3. A reusable tag input component for use here, in the manual entry dialog (BP-082), and in any future tag use cases (post tagging, etc.)

### Proposed Database Changes

**Migration:** `20260412_add_idea_priority.sql`
```sql
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS priority text
    CHECK (priority IN ('low', 'medium', 'high'));
-- Nullable, no default. Unset priority means "no priority" — users
-- shouldn't be forced to triage everything they capture.
```

**No migration needed for tags** — `ideas.tags text[]` already exists and is populated by AI. We're just adding UI.

### New Constants

`src/lib/constants.ts` — add:
```ts
export const IDEA_PRIORITIES = {
  high:   { label: "High",   color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",       order: 3 },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", order: 2 },
  low:    { label: "Low",    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", order: 1 },
} as const;
```

Deliberately **NOT reusing** the removed temperature color palette (hot/warm/cold). This is a different concept: priority is user-assigned and reversible; temperature was AI-assigned and confusing.

### UX Mockup: Idea Card with Tags & Priority

```
┌─────────────────────────────────────────────────┐
│ [High Priority]                    [ Captured ] │  ← priority badge left, status badge right
│                                                 │
│ The 5 mistakes I made as a first-time founder   │  ← title
│                                                 │
│ A post-mortem style write-up about the specific │  ← description (line-clamp-2)
│ decisions that cost me time and money...        │
│                                                 │
│ [Leadership] [Startups]                         │  ← content pillars (outline badges)
│                                                 │
│ #founderjourney  #lessonsLearned  #startup      │  ← tags (secondary badges, smaller)
│                                                 │
│                           [Edit]  [Develop →]   │  ← actions
└─────────────────────────────────────────────────┘
```

**Visual hierarchy:**
- **Priority badge:** top-left, always visible when set; color-coded (red/amber/slate). Hidden entirely when unset — no "None" badge.
- **Status badge:** top-right (current behavior)
- **Content pillars:** just under the description (current behavior)
- **Tags:** new row under pillars, smaller text, `bg-muted` subtle style so they don't compete with pillars
- **No tag row** when the idea has zero tags

### UX Mockup: Edit/Create Idea Dialog

```
┌─ Edit Idea ──────────────────────────────── × ─┐
│                                                 │
│ Title                                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ The 5 mistakes I made as a first-time fou…  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Description                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ A post-mortem style write-up about the      │ │
│ │ specific decisions that cost me time...     │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Content Pillar                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Leadership                                ▼ │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Priority                                        │
│ ( ) None  ( ) Low  ( ) Medium  (●) High         │  ← radio pills
│                                                 │
│ Tags                                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ [founderjourney ×] [lessonsLearned ×]       │ │
│ │ [startup ×]  Type and press Enter to add... │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                          [ Cancel ]  [ Save ]   │
└─────────────────────────────────────────────────┘
```

**Tag input behavior:**
- Type freely, press **Enter** or **,** (comma) to commit a tag
- **Backspace** on empty input removes the last tag
- **Click ×** on a tag chip to remove it
- No duplicates (case-insensitive); silently dedupes
- No hard limit, but soft-warn at 10+ tags ("That's a lot of tags — consider consolidating.")
- No `#` prefix auto-added — tags are stored as plain words; display formatting is up to the consumer

### UX Mockup: Filter Bar (Ideas Page)

Extend the existing filter bar under the header with two new rows:

```
Status:   [ Open Ideas ▼ ]  [ Closed Ideas ]  [ All ]

Priority: [ All ] [ 🔴 High ] [ 🟡 Medium ] [ ⚪ Low ] [ ☐ No Priority ]

Tags:     [ All ] [ founderjourney × ] [ lessonsLearned × ]  + Add filter
          ↑ clicking a tag badge anywhere on the page adds it here

Search:   [ 🔍 Search ideas...                              ]
```

**Filter behavior:**
- **Priority filter:** single-select pills. "All" is default. "No Priority" matches `priority IS NULL`.
- **Tag filter:** multi-select. Multiple selected tags are combined with **AND** (must have all selected tags). Clicking a tag badge on any idea card **adds it to the filter** — low-friction discovery.
- **All three filter rows are additive** — status + priority + tags + search are ANDed together (current behavior for status + search; just extended).
- **Clear filters** button appears when any non-default filter is active.

### Example User Workflow: "I just generated 10 ideas, now I want to triage them"

1. **User lands on Ideas page** after clicking "Generate Ideas" → 10 new cards appear at the top, all with status "Captured" and no priority set.
2. **User skims the cards.** The first one looks great — *"The 5 mistakes I made as a first-time founder"*.
3. **User clicks "Edit"** on that card → dialog opens.
4. **User sets Priority to High**, adds tags `founderjourney, lessonsLearned, startup`, clicks Save.
5. The card now shows a red **[High Priority]** badge and three tag chips under the content pillars.
6. **User skims more cards.** A weaker one — *"Generic productivity tip"* — gets **Low** priority.
7. **Another idea is unclear** — user doesn't set priority at all. It stays in the "No Priority" bucket (the default).
8. **User clicks the Priority filter: High** → list narrows to the 2-3 high-priority ideas.
9. **User clicks "Develop →"** on the top one to turn it into a post draft.
10. **Next week**, user comes back, clicks Priority: **Medium** to pick up the next tier, then **Low** when they need filler content.

### Implementation Notes

- **Tag input component:** Build `src/components/ui/tag-input.tsx` as a reusable shadcn-style primitive. Props: `value: string[]`, `onChange: (tags: string[]) => void`, `placeholder?: string`, `maxTags?: number`. Use controlled state. No external library — the hashtag editor in `src/app/(app)/posts/[id]/page.tsx:1600-1621` is a close precedent to model the chip-removal UX on.
- **Priority radio:** simple button-group pills. `{null, 'low', 'medium', 'high'}` — 4 states. Use the existing `FilterPill` component pattern from the Ideas page.
- **Filter UI:** extend the existing filter bar in `src/app/(app)/ideas/page.tsx:430-564`. Add priority filter pills right after the status row, tag filter after that.
- **Filter state:** add `priorityFilter: string` and `tagFilter: string[]` to the existing filter state block. Extend `filteredIdeas` useMemo with both.
- **Sort by priority:** optionally add a "Sort by priority" option to show high → medium → low → none order. Could default to this when the priority filter is "All" so users see high priority first naturally. (Nice-to-have, not required.)
- **Update IdeaProcessFlow copy:** once this ships, the step 2 copy is no longer a lie. No copy change needed — it already matches.

### Tier Gating

All of this should be available on **all tiers**. Tagging and prioritization are organization features that help users get value — not premium upsells. BYOK and AI quotas are the right place for gating; organizational metadata is not.

### Acceptance Criteria

1. `ideas.priority` column exists, nullable, constrained to `('low', 'medium', 'high')`
2. Edit Idea dialog has Priority radio pills (None/Low/Medium/High) and a Tags input with chip removal
3. Create Idea dialog (BP-082) gets the same Priority + Tags fields
4. Idea cards show a priority badge (when set) and a tag row (when non-empty)
5. Filter bar on Ideas page supports priority filter + multi-select tag filter, combinable with existing status + search filters
6. Clicking a tag on any card adds it to the active tag filter
7. Reusable `<TagInput />` component in `src/components/ui/tag-input.tsx` with documented props
8. Zero breaking changes to the existing AI brainstorm flow (which will continue populating tags opportunistically)
9. `tsc --noEmit` clean, no new console errors

### Out of Scope

- **Tag management screen** (renaming, merging, deleting tags globally) — future BP if tag sprawl becomes an issue
- **Tag auto-complete** from previously-used tags — nice-to-have, could be added later
- **Priority on posts** — posts have their own lifecycle (draft/review/scheduled/etc.), priority there is a separate conversation
- **Custom priority levels** beyond 3 — keep it simple

---

### BP-084: Tutorial Card Visual Redesign

**Status:** Backlog
**Priority:** High
**Source:** Owner UX direction with reference mockups
**Date Added:** 2026-04-11

**Problem:**
The current tutorial card (`src/components/tutorial/tutorial-card.tsx`) is a compact, all-primary-blue dialog with white text, an emoji icon in the header, and a small progress bar at the bottom. It doesn't match the rest of the app's theme, has no space for visual content, and feels cramped. Users learn better with visual aids (screenshots, short animations, or clips demonstrating the feature), but there's nowhere to put them today.

The owner provided two reference mockups (light and dark theme) showing a redesigned card that:
- Uses the system theme colors (bg-card, border, text-foreground) instead of a solid primary color
- Has a prominent, dedicated media area above the title for images/gifs/videos
- Replaces the bottom progress bar with a "STEP X OF Y" pill badge at the top
- Uses a full-width primary CTA button ("Next →" / "Finish")
- Adds a clear "SKIP TUTORIAL" text link below the CTA

**Note:** The owner has flagged that the tutorial system overall is not functioning properly. This BP is scoped to the *visual redesign only*. Functional bugs (state management, targeting, wait-for-action detection, etc.) are a separate future task. The redesign should land in a way that is isolated from behavior changes so the cleanup work can proceed independently.

### Reference Mockups

The owner provided two screenshots showing the target design (light + dark theme). Save them to:
- `docs/images/tutorial-card-light.png` — light theme reference
- `docs/images/tutorial-card-dark.png` — dark theme reference

Both are also embedded in the design spec section of `docs/GUIDED-TOURS-REQUIREMENTS.md`.

### Visual Specification

```
┌─ Tutorial Card ────────────────────────────────┐
│                                                 │
│  ┌─ STEP 1 OF 3 ─┐                        [ × ] │  ← step pill (top-left) + close (top-right)
│  └───────────────┘                              │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │                                             │ │
│  │                                             │ │
│  │              [  ICON / MEDIA  ]             │ │  ← media slot: image, gif, video, or placeholder icon
│  │                                             │ │
│  │                                             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Meet Draft Posts                               │  ← bold title (text-xl)
│                                                 │
│  Your private sanctuary for refining thoughts. │  ← description (text-sm, muted-foreground)
│  Save ideas, polish tone, and schedule for the │
│  perfect moment.                                │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │            Next  →                       │   │  ← full-width primary button
│  └─────────────────────────────────────────┘   │
│                                                 │
│              SKIP TUTORIAL                      │  ← small uppercase muted text link
│                                                 │
└─────────────────────────────────────────────────┘
```

**Card dimensions:** `w-[420px] max-w-[calc(100vw-2rem)]` (slightly wider than current 380 to accommodate media)
**Card styling:**
- Background: `bg-card` with subtle `border border-border`
- Corner radius: `rounded-2xl`
- Shadow: `shadow-2xl` (keep the elevation)
- Padding: ~`p-6` inside the card

**Step pill:**
- Position: top-left
- Styling: `bg-primary/10 text-primary dark:bg-primary/20` rounded-full pill
- Typography: `text-[11px] font-bold uppercase tracking-wider`
- Format: `STEP {currentStep + 1} OF {totalSteps}`

**Close button:**
- Position: top-right
- Styling: no background, `text-muted-foreground hover:text-foreground` transition
- Icon: `X` from lucide-react, `size-5`

**Media slot:**
- Aspect ratio: 16:9 (approx `aspect-video`)
- Background: `bg-muted` when empty
- Corner radius: `rounded-xl`
- **Empty state:** centered placeholder icon (`step.icon` or a default) inside a white/card rounded tile on top of the muted background
- **Image state:** full-bleed `object-cover` image
- **Video/gif state:** same as image, autoplay muted loop for gifs/webp; controls-free `<video autoPlay muted loop playsInline>` for video
- The slot is always rendered — when a step has no media, the placeholder icon is shown (matches the mockup exactly)

**Title:**
- Typography: `text-xl font-bold text-foreground`
- Line-height: `leading-tight`
- Margin-top: `mt-5` after the media slot

**Description:**
- Typography: `text-sm text-muted-foreground leading-relaxed`
- Margin-top: `mt-2` after the title

**Primary CTA:**
- Full-width (`w-full`)
- Height: ~`h-12`
- Gradient or solid `bg-primary text-primary-foreground` with `rounded-xl`
- Large font: `text-base font-semibold`
- Right-arrow icon (`ArrowRight` from lucide) trailing the label with `gap-2`
- Label: `"Next"` on mid-steps, `"Finish"` on the final step
- Disabled state when `waitingForAction` is true: show `"Waiting..."` with reduced opacity

**Skip link:**
- Small button below the CTA
- Typography: `text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground`
- Label: `"SKIP TUTORIAL"`
- Invokes the same `onClose` handler as the X button

**Theme support:**
- All colors use CSS variables from the existing theme (`--card`, `--border`, `--muted`, `--muted-foreground`, `--primary`, `--primary-foreground`)
- Light and dark themes must both look correct without any theme-specific hardcoded colors
- Test against both themes during implementation; owner provided both mockups

### Component API Changes

**`TutorialStep` type** (in `src/lib/tutorials/tutorial-engine.ts` or wherever it currently lives — find via grep):

Add an optional `media` field so steps can specify visual content:

```ts
interface TutorialStep {
  // ... existing fields
  icon: string;              // emoji or icon name, used as fallback placeholder
  title: string;
  content: string;           // description text
  selector?: string;
  waitFor?: "click" | "input" | "manual" | string;

  // NEW: optional media slot content
  media?: {
    type: "image" | "video" | "gif";
    src: string;             // public URL or /images/... path
    alt?: string;            // for images only (a11y)
    poster?: string;         // optional still frame for videos
  };
}
```

**`TutorialCard` props** — no breaking changes; the new `media` field is read off the `step` prop.

**Existing tutorial definitions** (`src/lib/tutorials/tutorial-definitions.ts`):
- No changes required — they will render with the placeholder icon in the media slot until media is added later
- This is intentional: ship the redesign now, add media assets per-step incrementally over time

### Implementation Notes

- **File:** rewrite `src/components/tutorial/tutorial-card.tsx` entirely. The current file is 152 lines; the replacement should be similar length.
- **Fix pre-existing lint error:** the current file has `react/no-unescaped-entities` on line 87 (`you're` needs escaping). Clean this up as part of the rewrite.
- **Keep the confetti** on final-step finish — the owner liked that.
- **Drop the horizontal progress bar** (lines 92-100 of the current file). The step pill replaces it.
- **Drop the old footer layout** (lines 102-148 of the current file) — replaced by the full-width CTA + skip link structure.
- **`canvas-confetti` import** stays.
- **Icon handling:** the current card uses `step.icon` as an emoji in the header. In the new design it becomes the placeholder in the media slot. Update any tutorial step definitions that use emoji-as-icon to something that renders well centered in a rounded tile — or switch to lucide icons. Owner preference: keep it simple and use lucide icons consistently across steps.
- **No schema changes** — this is pure frontend.
- **Responsive:** on screens narrower than 440px, the card should respect `max-w-[calc(100vw-2rem)]` and the media slot should shrink proportionally.

### Out of Scope (separate future BPs)

- **Tutorial state machine / functional bugs:** reported as broken by the owner, will be addressed separately. This BP is visual-only.
- **Creating actual media assets** (screenshots, gifs, videos) for each tutorial step. That's a content task that can happen incrementally after the new card ships with placeholder support.
- **Tutorial analytics** (completion rates, drop-off by step).
- **Multi-language tutorial content.**

### Acceptance Criteria

1. `src/components/tutorial/tutorial-card.tsx` rewritten to match the provided mockups in both light and dark themes
2. New `media` field supported on `TutorialStep` type; when unset, the media slot shows a placeholder icon
3. "STEP X OF Y" pill at the top-left, close button top-right
4. Full-width primary CTA button with "Next →" / "Finish" states
5. "SKIP TUTORIAL" text link below the CTA
6. Uses system theme colors only (no hardcoded blues, no primary-colored card background)
7. Existing tutorial flows still launch and navigate correctly (no regressions to the engine — this is UI-only)
8. Confetti still fires on the final step
9. `tsc --noEmit` clean
10. Pre-existing lint error on the old card file (line 87) is resolved in the rewrite
11. Owner signs off after visual review on both themes

---

### BP-085: AI Usage Monitoring, Cost Analysis & Budget Enforcement (Admin Portal)

**Status:** Backlog
**Priority:** High
**Source:** Owner — need visibility into AI spend, abuse detection, and upsell opportunities
**Date Added:** 2026-04-11

**Problem:**
Right now we have zero visibility into what AI requests actually cost the business. The `usage_quotas` table tracks *counts* (posts, brainstorms, chat messages) but not *dollars*. Since the Vercel AI Gateway rollout, most non-BYOK requests route through a single billed endpoint — we have the raw data, we just aren't capturing or displaying it. We also have no mechanism to stop a runaway user from bleeding us dry, and no data-driven way to identify users who are ripe for an upgrade.

This BP delivers the operational dashboard + enforcement + upsell intelligence layer we'll need before we open the gates more broadly.

### Goals

1. **Visibility:** See what we're spending on AI by user, tier, provider, model, route, time period
2. **Protection:** Detect and auto-pause abuse before it costs us real money
3. **Growth:** Identify users whose actual usage justifies a tier upgrade

### Architecture Overview

```
┌────────────────────────────────────────────────────┐
│              AI route handlers                      │
│  (draft, chat, enhance, hashtags, brainstorm, …)    │
└──────────────┬──────────────────────────────────────┘
               │ after each request, log event
               ▼
┌────────────────────────────────────────────────────┐
│           ai_usage_events table                     │
│   Every AI call: user, provider, model, tokens,     │
│   cost_usd, source, success, generation_id          │
└──────────────┬──────────────────────────────────────┘
               │ aggregation queries (cached)
               ▼
┌────────────────────────────────────────────────────┐
│     /admin/usage dashboard + budget enforcer        │
│  KPIs • charts • drilldowns • budgets • alerts      │
└────────────────────────────────────────────────────┘
```

### Phase 1 — Data Capture (foundational, nothing visible)

**New migration:** `ai_usage_events` table

```sql
CREATE TABLE ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,

  -- What ran
  route text NOT NULL,                  -- 'draft', 'chat', 'enhance', 'hashtags', 'brainstorm', 'analyze-hook', 'generate-image'
  provider text NOT NULL,               -- 'anthropic', 'openai', 'google', 'perplexity'
  model text NOT NULL,                  -- 'claude-sonnet-4-6', 'gpt-4.1', etc.
  source text NOT NULL,                 -- 'gateway' | 'byok' | 'system_key'

  -- Token accounting
  input_tokens integer,
  output_tokens integer,
  cached_tokens integer,                -- from prompt caching
  reasoning_tokens integer,             -- for o-series / thinking models

  -- Cost
  cost_usd numeric(10,6),               -- exact from gateway, estimated for BYOK direct

  -- Outcome
  success boolean NOT NULL DEFAULT true,
  error_code text,                      -- 'rate_limit' | 'auth' | 'content_policy' | 'timeout' | ...

  -- Correlation
  generation_id text,                   -- gen_<ulid> from Vercel AI Gateway
  latency_ms integer,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_events_user_created_idx ON ai_usage_events (user_id, created_at DESC);
CREATE INDEX ai_usage_events_created_idx ON ai_usage_events (created_at DESC);
CREATE INDEX ai_usage_events_provider_created_idx ON ai_usage_events (provider, created_at DESC);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
-- Users can read their own events (for future "my usage" page)
CREATE POLICY "Users read own usage" ON ai_usage_events FOR SELECT USING (auth.uid() = user_id);
-- Inserts happen via server-side routes only, which use the service role and bypass RLS
```

**New helper:** `src/lib/ai/usage-logger.ts`

```ts
export async function logAiUsage(event: {
  userId: string;
  workspaceId?: string | null;
  route: string;
  provider: AIProvider;
  model: string;
  source: "gateway" | "byok" | "system_key";
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  costUsd?: number;
  success: boolean;
  errorCode?: string;
  generationId?: string;
  latencyMs?: number;
}): Promise<void>;
```

**Wire-up:** every AI route (draft, chat, enhance, hashtags, brainstorm, analyze-hook, generate-image) calls `logAiUsage` after the provider call. For gateway requests, extract cost from `providerMetadata` or `/v1/generation?id=...` lookup. For BYOK direct calls, estimate cost from a server-side rate table (`src/lib/ai/cost-table.ts`) keyed by `provider/model` with per-input-token and per-output-token rates.

**Do NOT block the response on logging** — fire-and-forget with error swallowed. A failed log row is better than a failed user request.

### Phase 2 — Admin Usage Dashboard

**New routes:**
- `/admin/usage` — main dashboard
- `/admin/usage/[userId]` — per-user drill-down

**New API routes** (admin-gated):
- `GET /api/admin/usage/summary?range=30d&tier=creator&provider=openai` — aggregated KPIs
- `GET /api/admin/usage/timeseries?range=30d&groupBy=day&tier=creator` — chart data
- `GET /api/admin/usage/top-users?range=30d&metric=cost_usd&limit=20` — leaderboard
- `GET /api/admin/usage/user/[userId]?range=30d` — per-user breakdown

**Dashboard KPI cards** (top of page):
- **Total AI spend** (period) — sum of `cost_usd`, compared to prior period
- **Total requests** — count, compared to prior period
- **Avg cost per request** — trend
- **Active AI users** — distinct `user_id` count
- **Most expensive route** — sum of cost grouped by route
- **Gateway vs BYOK mix** — % of requests routed through gateway

**Filter bar:**
- Date range picker (today, 7d, 30d, 90d, custom)
- Tier filter (free / creator / pro / team / enterprise)
- Provider filter
- Route filter
- Source filter (gateway / byok / system_key)

**Charts:**
- **Line chart:** daily cost over time (stacked by provider or route, togglable)
- **Stacked bar chart:** total cost by tier, grouped by provider
- **Horizontal bar chart:** top 10 users by cost (click → drill down)
- **Pie/donut:** cost split by route (draft vs chat vs image gen etc)

**Per-user drill-down page** (`/admin/usage/[userId]`):
- User header: name, email, tier, managed_ai_access status, signup date, last active
- Their monthly cost + margin calculation (see Phase 4)
- Full request history table (paginated)
- Usage heatmap (requests per day for the last 90 days)
- Action buttons: Pause managed AI, Adjust budget, Send upgrade email, View as this user

### Phase 3 — Budget Enforcement + Auto-Pause + Alerts

**New migration:** extend `creator_profiles` with budget + pause fields

```sql
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS monthly_ai_budget_usd numeric(10,2),        -- null = use tier default
  ADD COLUMN IF NOT EXISTS managed_ai_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS managed_ai_pause_reason text;               -- 'budget_exceeded' | 'abuse_detected' | 'admin_manual'
```

**New migration:** `ai_usage_alerts` table for the alert feed

```sql
CREATE TABLE ai_usage_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,                   -- 'budget_warning_80' | 'budget_exceeded' | 'anomaly_rate' | 'anomaly_cost' | 'abuse_signature'
  severity text NOT NULL,               -- 'info' | 'warning' | 'critical'
  message text NOT NULL,
  context jsonb,                        -- snapshot of event data
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_alerts_unack_idx ON ai_usage_alerts (acknowledged, created_at DESC) WHERE acknowledged = false;
```

**Tier default budgets** in `src/lib/constants.ts`:
```ts
export const TIER_AI_BUDGETS_USD: Record<SubscriptionTier, number> = {
  free:         0.50,   // ~14-day trial worth of AI
  creator:      3.00,   // Creator plan margin target
  professional: 10.00,  // Pro plan margin target
  team:         30.00,  // Team scale
  enterprise:   Infinity, // Custom billing
};
```

Owner can override per-user via `creator_profiles.monthly_ai_budget_usd`.

**Pre-request budget check** (in `getUserAIClient` or a new `enforceAiBudget` helper):
- Before any managed AI request, compute current-month spend for the user
- If `current_month_spend >= budget`: set `managed_ai_paused_at = now()`, insert alert, reject with 402 error + friendly message
- If `current_month_spend >= 80% of budget`: insert info alert, allow request

**Abuse detection signals** (run after each event insert, async):
- **Rate anomaly:** user's requests-per-minute > 10x their 7-day baseline
- **Cost anomaly:** single request cost > $1 OR today's spend > 5x the 7-day daily average
- **Abuse signature:** same user, 100+ requests in an hour, OR token counts suggesting prompt scraping
- Any signal → insert alert; for `critical` signals → auto-pause

**Alert delivery channels** (Phase 3A: in-app + email; Phase 3B: webhooks):
- **In-app badge** on `/admin` nav when unacknowledged alerts exist
- **Email digest** to `ADMIN_EMAILS`: immediate for `critical`, daily summary for `warning/info`
- **Webhook URL** (future) for Slack/Discord integration

**Unpause flow:** `/admin/usage/[userId]` has an "Unpause managed AI" button that requires typing the user's email to confirm, clears the pause fields, and logs the action in an audit trail.

### Phase 4 — Upsell Intelligence & LTV

**New view / query:** `v_user_tier_economics`
Computes per user:
- `tier` — current tier
- `current_monthly_spend_usd` — their actual AI cost this month
- `current_monthly_price_usd` — what we're charging them
- `current_margin_usd` — price − cost − fixed overhead allocation
- `next_tier` — the tier above
- `next_tier_price_usd`
- `projected_next_tier_margin_usd` — price of next tier − current cost − overhead
- `upsell_score` — composite ranking (high = ready to upgrade, low = keep where they are)

**Upsell signals (any of these triggers the "upsell" flag):**
- Hit quota limit 2+ consecutive months
- Actual AI cost > current tier price (losing money on this user)
- Usage 80%+ of tier ceiling for 2 weeks
- Opens a feature gated to higher tier (e.g., clicks Workspace button on Pro plan)

**Upsell dashboard** at `/admin/usage/upsell`:
- List of ranked upsell candidates
- Each row: user, current tier, current spend, projected new-tier margin, signals fired
- Bulk action: "Send upgrade email" (template-driven)

**Tier migration simulator:** "If every Creator moved to Pro, what would margin look like?"
- Slider for migration % (0-100%)
- Updates projected revenue and margin in real time
- Uses the last 30 days of real usage data as the base

### Phase 5 — Audit + Misc

**New `admin_audit_log` table** captures every admin action:
- `pause_managed_ai`
- `unpause_managed_ai`
- `adjust_budget`
- `change_tier`
- `acknowledge_alert`
- `send_upgrade_email`

Every admin UI action logs to this table. Visible at `/admin/audit`.

### Tier gating

- Admin routes require `ADMIN_EMAILS` whitelist (existing behavior from `/api/admin/users/route.ts`)
- End-user usage data is always user-scoped by RLS
- A future "See your own usage" self-service page for end users is out of scope

### Additional recommendations (owner decides what to include)

Here are the extras I think would add real value. **Cherry-pick whichever ones you want in scope** and I'll fold them into the BP:

1. **Prompt cache savings tracker** — the Vercel AI Gateway supports `caching: 'auto'` which saves real money on repeated system prompts. Track `cached_tokens` as a separate metric so we can see "cache savings = $X this month" and prove the gateway is earning its keep.

2. **Error-rate-per-provider panel** — failed gateway requests still cost tokens sometimes, and a flaky provider is something we want to know about fast. Track `error_code` counts per provider over time. Informs when to order providers differently in the gateway fallback chain.

3. **Cost-per-feature ROI** — group total spend by route and correlate with engagement. "AI image generation cost us $120 last month but only 8 users actually published the images → maybe gate harder or improve UX." Hard data for product decisions.

4. **Retention early-warning signal** — users whose weekly usage drops more than 50% vs. their baseline are likely about to churn. Flag them for a check-in email. Doubles the usage data as a retention tool.

5. **Bulk actions in the admin UI** — select N users at once and pause / unpause / send a templated email / adjust tier. Saves time when handling a scraping incident or running an upgrade campaign.

6. **Monthly automated owner report** — an auto-emailed summary at the end of each month: *"You spent $X on AI, earned $Y in subscriptions, margin is Z%. Top 5 most expensive users: ... Top 5 upsell candidates: ..."*. Puts the most important insights in your inbox without you having to log in.

7. **Rate limiter on AI routes** — `usage_quotas` is a *monthly* limit, but a single user could burn their whole month's quota in 10 minutes. Add a per-minute and per-hour rate limit on AI endpoints (e.g., 20/min, 200/hr). Sliding window via Postgres or Upstash Redis later. Stops abuse before it even registers in the budget layer.

8. **Data export (CSV/JSON)** — owner can export usage data from the admin UI for their own analysis in a spreadsheet. Low-effort, high-utility.

9. **Trial abuse detection** — since new users get 14-day managed AI access, there's incentive to create multiple trial accounts. Detect: same IP signing up 3+ times, suspicious email patterns (`user+1@`, disposable domains), same browser fingerprint. Not foolproof but cuts the obvious cases.

10. **Provider fallback monitoring** — Vercel AI Gateway automatically retries failed requests against other providers. Track how often this happens in the `generation` metadata. If provider X is failing over 20% of the time, pull it from the rotation.

11. **User value score (composite metric)** — combine retention, cost, engagement, and upsell score into a single 0-100 "VIP score" for each user. Sort your top 20 VIPs and treat them well.

12. **Cost-of-churn analysis** — when a user downgrades or deletes their account, what were they spending and what were they paying? Feeds into pricing decisions ("we're losing X per month from churned Pro users, let's improve retention there").

**My top 3 picks from this list if you want a lean additional scope:**
- #1 (Prompt cache savings) — nearly free, proves the gateway ROI
- #6 (Monthly owner report) — huge leverage, you get the value without opening the dashboard
- #7 (Rate limiter) — critical safety net that stops whole classes of abuse before they hit the budget layer

### Implementation phases (delivery order)

| Phase | Scope | Can ship independently? |
|---|---|---|
| **1** | `ai_usage_events` table + logger helper + wire-up to 7 AI routes | Yes — no UI, just data collection |
| **2** | Admin dashboard, KPIs, charts, per-user drill-down | Yes — read-only reports |
| **3** | Budgets + auto-pause + alert feed | Yes — enforcement layer |
| **4** | Upsell intelligence + LTV analysis + migration simulator | Yes — growth layer |
| **5** | Audit log + any of the "additional" items the owner selects | Yes — polish |

Ship Phase 1 ASAP even without the UI — the sooner we're collecting data, the sooner Phase 2 has something to show.

### Out of scope for this BP

- Self-service "My usage" page for end users — separate future BP
- Stripe/billing integration (BP-015, deferred to pre-launch)
- Per-workspace rollup (gated to Team tier existing)
- Machine-learning-based anomaly detection — simple rule-based is enough for now
- Historical backfill — we start collecting from Phase 1 ship date

### Acceptance criteria (all phases)

1. Every AI request logs a row to `ai_usage_events` with cost (exact from gateway, estimated for BYOK)
2. `/admin/usage` dashboard shows working KPI cards, filters, and at least 2 chart types with real data
3. Owner can set a per-user budget override and the system enforces it
4. A user exceeding their budget is auto-paused, can't hit managed AI, and appears in the alert feed
5. Pause/unpause actions are logged to audit
6. Upsell dashboard lists ranked candidates with projected-next-tier margin
7. All admin routes RLS/whitelist-gated
8. `tsc --noEmit` clean, lint clean
9. Verified end-to-end in the browser preview with real usage data

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
- **BP-038:** Manual Post Status Change — Mark as Posted (2026-04-03)
- **BP-040:** Fix Dashboard "New Post" Button Navigation (2026-04-03)
- **BP-042:** Include Post Title in LinkedIn Publish & Preview (2026-04-03)
- **BP-043:** Investigate & Fix Frequent LinkedIn Disconnections (2026-04-03)
- **BP-044:** Publish to LinkedIn Preview & Confirmation Flow (2026-04-03)
- **BP-019:** Content Library (2026-04-03)
- **BP-020:** Post Templates (2026-04-03)
- **BP-022:** Advanced Scheduling Suggestions (2026-04-03)
- **BP-034:** Past-Due Checker — Direct Publish Button (2026-04-03)
- **BP-036:** Emoji Picker in Post Editor (2026-04-03)
- **BP-037:** Clarify Version Management & Convert to Post UX (2026-04-03)
- **BP-029:** AI Image Generation (2026-04-03)
- **BP-039:** Image Upload to LinkedIn Posts (2026-04-03)
- **BP-041:** Image Generation Requirements Spec (2026-04-03)
- **BP-016:** Usage Quota System (2026-04-04)
- **BP-017:** Pricing Page (2026-04-04)
- **BP-018:** Feature Gating Logic (2026-04-04)
- **BP-021:** Manual Analytics (2026-04-04)
- **BP-038:** Manual Post Status Change (2026-04-03)
- **BP-054:** Managed AI Access — System Keys & Trial (2026-04-04)
- **BP-055:** Managed AI Access — Settings & Onboarding UX (2026-04-04)
- **BP-056:** Alpha Feedback — No Em Dashes AI Rule (2026-04-07)
- **BP-057:** Alpha Feedback — Credit Exhaustion Error UX (2026-04-07)
- **BP-058:** Alpha Feedback — Scheduled Status Clarification (2026-04-07)
- **BP-059:** Alpha Feedback — Tooltip System & Post Card Actions Redesign (2026-04-07)
- **BP-060:** Alpha Feedback — Product-Wide Tooltips Rollout (2026-04-07)
- **BP-061:** Alpha Feedback — Help System Expansion (2026-04-07)
- **BP-062:** Alpha Feedback — Post Progress Bar & Timeline (2026-04-07)
- **BP-063:** Alpha Feedback — Reschedule Posts (2026-04-07)
- **BP-064:** Alpha Feedback — Calendar Hover Preview & Post Now (2026-04-07)
- **BP-065:** Alpha Feedback — Idea Process Flow Visualization (2026-04-07)
- **BP-066:** Alpha Feedback — Deeper AI Editor Integration (2026-04-07)
- **BP-067:** Alpha Feedback — Auto-Draft from Idea Bank (2026-04-07)
- **BP-068:** Alpha Feedback — LinkedIn Auto-Connect & Disconnect Banner (2026-04-07)
- **BP-069:** Alpha Feedback — Content Tools Onboarding Step (2026-04-07)
- **BP-070:** Alpha Feedback — AI Cost Optimization Model Router (2026-04-07)
- **BP-071:** Alpha Feedback — Unified Editor Actions Dropdown (2026-04-07)
- **BP-072:** Alpha Feedback — Publish Preview Flow (2026-04-07)
- **BP-073:** Alpha Feedback — Image Version Picker (2026-04-07)
- **BP-074:** Alpha Feedback — Help Sidebar (Non-Modal Slide-Out) (2026-04-07)
- **BP-075:** Alpha Feedback — Review Status Gated to Team/Enterprise (2026-04-07)
- **BP-076:** Vercel AI Gateway Integration (2026-04-10)
- **BP-077:** Force AI Gateway Toggle (2026-04-10)
- **BP-078:** AI Provider Settings Card Overhaul (2026-04-10)
- **BP-079:** Settings Copy Rewrite for Non-Technical Readers (2026-04-11)
- **BP-080:** AI Provider Settings Collapsible Polish (2026-04-11)
- **BP-081:** Remove Idea Temperature Feature (2026-04-11)
- **BP-082:** Manual Idea Entry (2026-04-11)
- **BP-083:** Idea Tagging & Prioritization (2026-04-11)
