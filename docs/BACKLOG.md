# PostPilot - Product Backlog

> Last updated: 2026-04-07

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
