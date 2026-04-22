# PostPilot - Product Backlog

> Last updated: 2026-04-16 (Trial system + Team collaboration suite shipped: BP-023, BP-046-051, BP-087 done; BP-025 API prep done pending LinkedIn approval. Added BP-088–BP-097 from 48-hour system review — see [docs/reviews/2026-04-16-system-review.md](reviews/2026-04-16-system-review.md))
>
> **2026-04-16 STRATEGIC PIVOT:** Billing deferred until Free→Pro viability is validated. All Team+ features feature-flagged behind BP-098. See [docs/reviews/2026-04-16-backlog-reprioritization.md](reviews/2026-04-16-backlog-reprioritization.md) for the new priority tiers (P0–P3 + Deferred) and sprint plan.
>
> **2026-04-16 (later same day):** Added BP-099 — Simplified Guided UI Mode (conversational assistant for less technical users). Captured a previously uncaptured owner idea. P1 / High; recommended phased rollout starting after Sprint 2.
>
> **2026-04-16 (production bug report):** Added BP-100 (P1 Critical, confirmed) — scheduled posts published via the Edge Function silently drop the user's selected image. Root cause identified: Edge Function never updated after image support shipped. Added BP-101 (P2 Watching) — possible historical text-truncation bug in scheduled posts; not currently reproducible, monitoring for recurrence.
>
> **2026-04-22 (BP-101 reproduced + fixed):** BP-101 promoted to P1 Critical and shipped as Done (Edge Function v16 + src/lib/linkedin-api.ts). Root cause: LinkedIn's REST Posts API `commentary` field uses "Little Text Format" with 15 reserved characters that must be backslash-escaped (`|{}@[]()<>#\\*_~`). When unescaped, LinkedIn silently truncates the post at the first reserved character. New `escapeLinkedInText()` helper in both Deno (Edge Function) and Node runtimes handles this.

## Priority Legend (post-2026-04-16 pivot)

| Tier | Meaning |
|------|---------|
| **P0 / Critical** | Foundation for the new direction — must land first |
| **P1 / Critical** or **P1 / High** | Free→Pro viability blocker |
| **P2 / Medium** | Free→Pro polish & engagement |
| **P3 / Low** | Pro tier differentiation, can wait |
| **Deferred (Team)** | Team+ feature, hidden behind BP-098 flag, no active work |
| **Deferred (Revenue)** | Billing/monetization, on hold until product viability proven |
| **Blocked** | External dependency (e.g. LinkedIn API approval) |
| **Superseded** | Replaced by a newer BP that shipped |

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
**Priority:** Deferred (Revenue) — was Critical
**Re-prioritized:** 2026-04-16 — billing deferred until Free→Pro product viability is validated through user feedback. See [reprioritization report](reviews/2026-04-16-backlog-reprioritization.md).
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

**Status:** Backlog (informational page may be live; Checkout deferred)
**Priority:** Deferred (Revenue) — was High
**Re-prioritized:** 2026-04-16 — keep the page as marketing/info only; strip Stripe Checkout integration; add "alpha — all features free" messaging. Re-activate when BP-015 reactivates.
**Source:** Pricing strategy
**Date Added:** 2026-04-01
**Phase:** 1

**Description:**
Public pricing page with tier comparison table, feature breakdown, FAQ, and Stripe Checkout integration.

---

### BP-018: Feature Gating Logic

**Status:** Backlog
**Priority:** P0 / Critical — was High
**Re-prioritized:** 2026-04-16 — promoted to P0 foundation. The gating utility (`hasFeature(tier, feature)`) becomes the single source of truth for both tier checks AND the new master Team-features flag (see BP-098). Must short-circuit Team feature requests to false when `NEXT_PUBLIC_TEAM_FEATURES_ENABLED=false`.
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
**Priority:** P1 / High — was Medium
**Re-prioritized:** 2026-04-16 — biggest gap in the Creator-tier value proposition. Without engagement tracking, "track your performance" is hollow. Critical for Free→Pro viability.
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

**Status:** Done (2026-04-16)
**Priority:** High
**Source:** Report feedback
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Add workspace type selector at onboarding start: "Individual Creator" vs "Brand/Team". Brand path captures: brand name, UVP, target audience personas, brand voice guidelines, sample content, content pillars.

---

### BP-024: Multi-User Workspaces

**Status:** Backlog (schema + much of UI shipped via BP-023, BP-046–051; remaining scope flagged)
**Priority:** Deferred (Team) — was High
**Re-prioritized:** 2026-04-16 — Team feature, hidden behind BP-098 master flag. Not actively worked.
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

**Status:** API prep done (2026-04-16) — blocked on LinkedIn app approval
**Priority:** Medium
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Read post engagement data from LinkedIn API. Requires `r_member_postAnalytics` scope via the Community Management API product.

**Infrastructure built:**
- `/api/linkedin/analytics` POST endpoint with token decrypt/refresh pattern
- `fetchPostEngagement()` helper calling `memberCreatorPostAnalytics` API per metric type (IMPRESSION, REACTION, COMMENT, RESHARE)
- `posts.analytics_fetched_at` + `creator_profiles.linkedin_scopes` columns
- OAuth flow requests `r_member_postAnalytics` scope; callback stores granted scopes
- RefreshAnalyticsButton with "scope required" fallback UI when the scope wasn't granted

**Blocker:** LinkedIn Community Management API product requires being the sole product on the app (existing app has `w_member_social` + `openid` + `profile`). Either a second LinkedIn app is needed, or wait for LinkedIn to relax the restriction. Manual analytics entry and paste-import remain the default path.

---

### BP-026: Trending Topics for Brainstorming

**Status:** Backlog
**Priority:** P2 / Medium
**Re-prioritized:** 2026-04-16 — Free→Pro brainstorm value-add. Ship the AI-only path first; defer RSS option.
**Source:** UVP evaluation
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
Inject trending industry news into brainstorm context via RSS feeds from industry blogs. Free option: rely on AI model's knowledge of current trends.

---

### BP-027: Voice Consistency Validation

**Status:** Backlog
**Priority:** P3 / Low
**Re-prioritized:** 2026-04-16 — Pro tier polish, no urgency. Revisit after Free→Pro viability validated.
**Source:** UVP evaluation
**Date Added:** 2026-04-01
**Phase:** 2

**Description:**
After each draft, compare generated text against voice samples. Show tone score (0-100 match). Highlight phrases that deviate from creator's typical tone.

---

### BP-028: Guided Enhancement Workflows

**Status:** Backlog
**Priority:** P2 / Medium — was Low
**Re-prioritized:** 2026-04-16 — promoted. High-leverage AI feature that differentiates PostPilot from "another AI wrapper." Real Free→Pro value.
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

**Status:** SUPERSEDED by BP-050 (shipped 2026-04-16)
**Priority:** Superseded — was Medium
**Re-prioritized:** 2026-04-16 — closed. Functionality delivered via the more comprehensive BP-050 (Configurable Approval Workflow). Refer to BP-050 and BP-089 (status transitions fix) for current state.
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Draft review/approve chain for teams. Editor submits for review, Admin approves or requests changes. Professional tier only.

---

### BP-031: Bulk Operations

**Status:** Backlog
**Priority:** P3 / Low
**Re-prioritized:** 2026-04-16 — Pro power-user feature; defer until Free→Pro validation done.
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Batch brainstorm (50 ideas at once), batch schedule, batch archive. Professional tier only.

---

### BP-032: A/B Testing for Hooks

**Status:** Backlog
**Priority:** P3 / Low
**Re-prioritized:** 2026-04-16 — Pro tier; depends on analytics data flowing (BP-021 ships first).
**Source:** UVP evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Generate multiple hook versions for the same post. Track which performs better via analytics. Professional tier only.

---

### BP-033: Content Pillar ROI Dashboard

**Status:** Backlog
**Priority:** P3 / Low
**Re-prioritized:** 2026-04-16 — Pro tier; depends on analytics data flowing.
**Source:** Product evaluation
**Date Added:** 2026-04-01
**Phase:** 3

**Description:**
Show which content pillars drive the most engagement. Requires analytics data (BP-021 or BP-025).

---

### BP-034: Past-Due Checker — Direct Publish Button

**Status:** Done (2026-04-22) — functionality had already landed in commit `ff01faf`; verified during Sprint 2 pass
**Priority:** P1 / High — was Medium
**Re-prioritized:** 2026-04-16 — solo-creator publish reliability. When auto-publish misses a slot, the user needs an obvious recovery action.
**Source:** LinkedIn integration follow-up
**Date Added:** 2026-04-01
**Completed:** 2026-04-22 (verified; code shipped earlier in commit `ff01faf`)
**Phase:** 1

**Description:**
Add "Publish Now" button to past-due checker dialog when user has active LinkedIn connection. Show `publish_error` if auto-publish failed.

---

### BP-035: Guided Tutorial — First Post Walkthrough

**Status:** Backlog (Tutorial SDK Phase 1 shipped 2026-04-15; functional cleanup pending)
**Priority:** P1 / Critical — was High
**Re-prioritized:** 2026-04-16 — promoted to viability blocker. Tutorial SDK shipped but per BP-084 the system "is not functioning properly." With Team paths hidden, every new user walks the Individual Creator tutorial — if it's broken, alpha fails. Scope: fix state management, targeting, wait-for-action detection.
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
**Priority:** P2 / Medium
**Re-prioritized:** 2026-04-16 — small win, high visibility. LinkedIn posts use emojis heavily. Ship in Sprint 4.
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

**Status:** Done (2026-04-22)
**Priority:** P1 / High
**Re-prioritized:** 2026-04-16 — confirmed P1. UX confusion blocks Free→Paid conversion. Ship in Sprint 2.
**Source:** Owner request (user confusion)
**Date Added:** 2026-04-02
**Completed:** 2026-04-22 (rename to "Save as New Post" landed earlier in commit `ff01faf`; Sprint 2 added explicit helper sub-text under every item in both Actions and Versions dropdowns so each action's outcome is unambiguous)
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
**Priority:** Deferred (Revenue) — was Medium
**Re-prioritized:** 2026-04-16 — revenue-side feature. Defer until Free-tier monetization strategy is decided after viability validation.
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

**Status:** Done (2026-04-16)
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

**Status:** Done (2026-04-16)
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

**Status:** Done (2026-04-16)
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

**Status:** Done (2026-04-16)
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

**Status:** Done (2026-04-16)
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

**Status:** Done (2026-04-16)
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
**Priority:** Deferred (Team) — was Medium
**Re-prioritized:** 2026-04-16 — Team feature, hidden behind BP-098 flag. No active work.
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
**Priority:** Deferred (Team) — was Medium
**Re-prioritized:** 2026-04-16 — Team feature, hidden behind BP-098 flag. No active work.
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

**Status:** Backlog (verify scope vs Tutorial SDK Phase 1 shipped 2026-04-15)
**Priority:** P2 / Medium — was High
**Re-prioritized:** 2026-04-16 — Tutorial SDK Phase 1 shipped a new card system (`OverviewCard`, `SimpleCard` with border-beam). Verify whether the spec in this BP is already addressed before doing more work. If gaps remain, fold the visual work into BP-035 (functional cleanup).
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
**Priority:** P1 / High
**Re-prioritized:** 2026-04-16 — confirmed P1. We're providing managed AI access (BP-054) to alpha users. Without cost telemetry, runaway usage could quietly bleed the business. Scope down to Phase 1 (data capture) + minimal admin KPI page. Defer the budget enforcement and upsell intelligence layers.
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
  cached_tokens integer,                -- from prompt caching (Item #1 savings tracker)
  reasoning_tokens integer,             -- for o-series / thinking models

  -- Cost
  cost_usd numeric(10,6),               -- exact from gateway, estimated for BYOK direct
  cached_savings_usd numeric(10,6),     -- Item #1: what cost_usd *would* have been without cache hits

  -- Outcome
  success boolean NOT NULL DEFAULT true,
  error_code text,                      -- 'rate_limit' | 'auth' | 'content_policy' | 'timeout' | ...

  -- Provider fallback monitoring (Item #10)
  -- Gateway may retry failed providers transparently; capture this when present in generation metadata
  attempted_providers text[],           -- e.g. ['anthropic', 'bedrock'] when fallback occurred
  final_provider text,                  -- the provider that actually served the response

  -- Correlation
  generation_id text,                   -- gen_<ulid> from Vercel AI Gateway
  latency_ms integer,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_events_user_created_idx ON ai_usage_events (user_id, created_at DESC);
CREATE INDEX ai_usage_events_created_idx ON ai_usage_events (created_at DESC);
CREATE INDEX ai_usage_events_provider_created_idx ON ai_usage_events (provider, created_at DESC);
CREATE INDEX ai_usage_events_route_created_idx ON ai_usage_events (route, created_at DESC);
CREATE INDEX ai_usage_events_error_idx ON ai_usage_events (error_code, created_at DESC) WHERE error_code IS NOT NULL;

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
  cachedSavingsUsd?: number;      // Item #1
  attemptedProviders?: string[];  // Item #10
  finalProvider?: string;         // Item #10
  success: boolean;
  errorCode?: string;
  generationId?: string;
  latencyMs?: number;
}): Promise<void>;
```

**Wire-up:** every AI route (draft, chat, enhance, hashtags, brainstorm, analyze-hook, generate-image) calls `logAiUsage` after the provider call. For gateway requests, extract cost and provider-fallback metadata from `providerMetadata` or the `/v1/generation?id=...` lookup. For BYOK direct calls, estimate cost from a server-side rate table (`src/lib/ai/cost-table.ts`) keyed by `provider/model` with per-input-token and per-output-token rates.

**Prompt cache savings calculation (Item #1):** when the gateway reports `cached_tokens > 0`, compute `cached_savings_usd = cached_tokens * (standard_input_rate - cache_read_rate)` using the rate table. Stored alongside `cost_usd` so dashboards can surface "cache savings this month = $X".

**Do NOT block the response on logging** — fire-and-forget with error swallowed. A failed log row is better than a failed user request.

### Phase 2 — Admin Usage Dashboard

**New routes:**
- `/admin/usage` — main dashboard
- `/admin/usage/[userId]` — per-user drill-down
- `/admin/usage/reliability` — error rate + provider fallback sub-page (Items #2, #10)
- `/admin/usage/features` — cost-per-feature ROI sub-page (Item #3)

**New API routes** (admin-gated):
- `GET /api/admin/usage/summary?range=30d&tier=creator&provider=openai` — aggregated KPIs
- `GET /api/admin/usage/timeseries?range=30d&groupBy=day&tier=creator` — chart data
- `GET /api/admin/usage/top-users?range=30d&metric=cost_usd&limit=20` — leaderboard
- `GET /api/admin/usage/user/[userId]?range=30d` — per-user breakdown
- `GET /api/admin/usage/reliability?range=30d` — error rates + fallback counts by provider (Items #2, #10)
- `GET /api/admin/usage/features?range=30d` — cost grouped by route joined with engagement metrics (Item #3)

**Dashboard KPI cards** (top of page):
- **Total AI spend** (period) — sum of `cost_usd`, compared to prior period
- **Total requests** — count, compared to prior period
- **Avg cost per request** — trend
- **Active AI users** — distinct `user_id` count
- **Most expensive route** — sum of cost grouped by route
- **Gateway vs BYOK mix** — % of requests routed through gateway
- **Prompt cache savings** (Item #1) — sum of `cached_savings_usd` this period, rendered as "saved $X via prompt caching this month"
- **Overall success rate** — `success=true` count / total, with red indicator if below 97%

**Filter bar:**
- Date range picker (today, 7d, 30d, 90d, custom)
- Tier filter (free / creator / pro / team / enterprise)
- Provider filter
- Route filter
- Source filter (gateway / byok / system_key)

**Charts (main dashboard):**
- **Line chart:** daily cost over time (stacked by provider or route, togglable)
- **Stacked bar chart:** total cost by tier, grouped by provider
- **Horizontal bar chart:** top 10 users by cost (click → drill down)
- **Pie/donut:** cost split by route (draft vs chat vs image gen etc)
- **Cache savings line chart (Item #1):** `cached_savings_usd` over time — proves the gateway is earning its keep

**Reliability sub-page (`/admin/usage/reliability`, Items #2 + #10):**
- **Error rate panel:** stacked bar chart of error counts per provider over time, grouped by `error_code`. Highlights providers whose rate crosses a threshold (e.g. >5%).
- **Provider fallback counts:** "In the last 30 days, Anthropic was the primary provider 8,432 times, failed 47 times (0.56%), and the gateway successfully fell back to Bedrock/Vertex/etc. N times with zero user impact." Data sourced from `attempted_providers` + `final_provider` columns.
- **Fallback chain visualization:** simple table showing primary → fallback pairs and counts. Lets us decide when to reorder the gateway provider chain.
- **Stale-provider warning banner:** if any provider has uptime <95% in the last 7 days, show a red banner at the top of `/admin/usage` with a link here.

**Cost-per-feature ROI sub-page (`/admin/usage/features`, Item #3):**
- **Table:** one row per AI route (draft, chat, enhance, hashtags, brainstorm, analyze-hook, generate-image) with columns:
  - Total spend in period
  - Requests in period
  - Unique users
  - Cost per request
  - **Downstream engagement metric** — e.g. for image generation, "% of generated images that got applied to a post that was then published to LinkedIn". For draft, "% of drafts that became published posts". For chat, "avg chat session length".
  - **Engagement-weighted cost** — cost / published outcomes, i.e. the dollars spent per published post that actually used this feature
- **Callout cards** above the table:
  - "Most cost-effective feature" — lowest cost per published outcome
  - "Cost sink" — highest cost per published outcome (i.e. where we're spending money that isn't driving value)
- **Use case:** "Image gen cost $120 last month but only 8 users actually published images → gate harder, improve UX, or retire the feature." This is exactly the kind of decision this page should support.
- **Implementation note:** requires a join between `ai_usage_events` and `posts` on `user_id` + time window. For image gen specifically, join with `post_image_versions.source='ai'` to find the ones that got used.

**Per-user drill-down page** (`/admin/usage/[userId]`):
- User header: name, email, tier, managed_ai_access status, signup date, last active
- Their monthly cost + margin calculation (see Phase 4)
- Full request history table (paginated)
- Usage heatmap (requests per day for the last 90 days)
- **Their cache savings** — how much we saved on this specific user via prompt caching
- **Their provider mix** — which providers served them and how often
- Action buttons: Pause managed AI, Adjust budget, Send upgrade email, View as this user

### Phase 3 — Budget Enforcement + Auto-Pause + Alerts + Safety Net

**New migration:** extend `creator_profiles` with budget + pause fields

```sql
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS monthly_ai_budget_usd numeric(10,2),        -- null = use tier default
  ADD COLUMN IF NOT EXISTS managed_ai_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS managed_ai_pause_reason text;               -- 'budget_exceeded' | 'abuse_detected' | 'rate_limit' | 'trial_abuse' | 'admin_manual'
```

**New migration:** `ai_usage_alerts` table for the alert feed

```sql
CREATE TABLE ai_usage_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,                   -- 'budget_warning_80' | 'budget_exceeded' | 'anomaly_rate' | 'anomaly_cost' | 'abuse_signature' | 'rate_limit_hit' | 'trial_abuse_suspected'
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
- If `current_month_spend >= budget`: set `managed_ai_paused_at = now()`, `pause_reason = 'budget_exceeded'`, insert alert, reject with 402 error + friendly message
- If `current_month_spend >= 80% of budget`: insert info alert, allow request

#### Rate Limiter (Item #7) — pre-budget safety net

`usage_quotas` tracks monthly counts but a single user can burn their whole month's quota in 10 minutes. The rate limiter sits *in front of* the budget check and stops runaway traffic before it even registers as spend.

**New migration:** `ai_rate_limit_buckets` (Postgres-based sliding window, minimal infra)

```sql
CREATE TABLE ai_rate_limit_buckets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,     -- bucket start (minute or hour granularity)
  window_kind text NOT NULL,             -- 'minute' | 'hour'
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_kind, window_start)
);
CREATE INDEX ai_rate_limit_recent_idx ON ai_rate_limit_buckets (user_id, window_kind, window_start DESC);
```

**Default limits** (in `src/lib/constants.ts`, overridable per-user via a future column if needed):
```ts
export const AI_RATE_LIMITS = {
  perMinute: 20,   // burst protection
  perHour:   200,  // sustained abuse
} as const;
```

**Enforcement helper** (`src/lib/ai/rate-limit.ts`):
- `checkAndIncrementRateLimit(userId)` — atomically increments the current minute + hour bucket
- Returns `{ allowed: boolean, limit: number, window: 'minute' | 'hour', resetAt: Date }`
- If `!allowed`, reject with 429 + friendly error, insert `rate_limit_hit` alert if the user hits the limit 3+ times in a rolling 10 min window (once per user, to avoid alert spam)
- **Cleanup:** a nightly cron (or PostgreSQL `pg_cron`) purges bucket rows older than 24 hours

**Wire-up:** called at the very top of every AI route handler, *before* the budget check. Order of operations:
1. Auth check
2. **Rate limit check** (this)
3. Quota check (existing)
4. Budget check (new)
5. Provider call

Rejection at step 2 never touches the AI provider so it's essentially free. If Phase 3 rate limiting proves insufficient under real load, we can swap to Upstash Redis later with no API change.

**Trial abuse detection (Item #9)** — runs on signup + first AI request

Cheap heuristics to catch the obvious cases of users creating multiple free-tier accounts for the 14-day trial:

- **Signup-time checks** (added to the signup flow):
  - Same IP address has created 3+ accounts in the last 7 days
  - Email domain matches a disposable-email blocklist (small hardcoded list: `tempmail.com`, `10minutemail.com`, etc. — can be expanded)
  - Email has a `+N` suffix matching an existing user's base (`tony+1@`, `tony+2@`)
  - Browser fingerprint (simple: user agent + language + screen dims hashed) matches an existing account

- **On first AI request** (cheaper to check here than every request):
  - Same IP as another account with `managed_ai_access=true` and recent usage
  - Account created within the last 24 hours + already hit 50% of trial budget

- **Action on any trigger:**
  - Insert `trial_abuse_suspected` alert with severity `warning`
  - For high-confidence triggers (3+ signup from same IP, disposable email domain): auto-pause with `pause_reason='trial_abuse'`
  - Do NOT delete the account — manual admin review via the alert feed

- **Storage:** new `trial_abuse_signals` table stores the signals fired per user so admin can see "why flagged"
  ```sql
  CREATE TABLE trial_abuse_signals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal text NOT NULL,           -- 'same_ip_3plus' | 'disposable_email' | 'plus_suffix_dup' | 'fingerprint_dup' | 'shared_ip_active_account'
    context jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ```

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

#### Bulk admin actions (Item #5)

The `/admin/usage` dashboard's top-users table and the alert feed both support multi-select with these bulk operations:

- **Pause managed AI** — pauses N users at once with a shared `pause_reason='admin_bulk'` and an audit log entry per user
- **Unpause managed AI** — reverse; requires confirmation typing "UNPAUSE N USERS"
- **Adjust budget** — set a monthly budget for N users in one modal
- **Send templated email** — pick from a small library of templates (upgrade offer, budget warning, abuse warning) and send to N users. Uses the existing email infrastructure.
- **Change tier** — owner-only escape hatch for promoting/demoting users in bulk (post-Stripe, this should sync to billing)
- **Acknowledge alerts** — clear N alerts at once from the feed

All bulk actions log one row per affected user in `admin_audit_log` so we have a record of "this button click touched these 23 users".

### Phase 4 — Upsell Intelligence, LTV & User Value Score

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
- `user_value_score` — Item #11, see below

**Upsell signals (any of these triggers the "upsell" flag):**
- Hit quota limit 2+ consecutive months
- Actual AI cost > current tier price (losing money on this user)
- Usage 80%+ of tier ceiling for 2 weeks
- Opens a feature gated to higher tier (e.g., clicks Workspace button on Pro plan)

**Upsell dashboard** at `/admin/usage/upsell`:
- List of ranked upsell candidates
- Each row: user, current tier, current spend, projected new-tier margin, signals fired
- Bulk action: "Send upgrade email" (template-driven) — uses the bulk action plumbing from Phase 3

**Tier migration simulator:** "If every Creator moved to Pro, what would margin look like?"
- Slider for migration % (0-100%)
- Updates projected revenue and margin in real time
- Uses the last 30 days of real usage data as the base

#### User Value Score (Item #11)

Composite 0-100 score computed per user that ranks their overall value to the business. Surfaced on the per-user drill-down page and used to sort a new "Top VIPs" leaderboard at `/admin/usage/vips`.

**Score components (weighted, all normalized 0-1):**

| Component | Weight | Source |
|---|---|---|
| **Retention signal** | 30% | Days since signup, capped at 180. Longer retention = higher score. |
| **Engagement signal** | 25% | Posts published per week, capped at 5. More publishing = higher score. |
| **Revenue signal** | 25% | Current tier price normalized to Enterprise ($99). Higher tier = higher score. |
| **Margin signal** | 15% | (tier_price − ai_cost) / tier_price. Profitable users score higher than cost sinks. |
| **Feature breadth** | 5% | How many different AI routes they've used in the last 30 days (out of 7 total). Broader use = higher. |

**Score interpretation:**
- **80-100 — VIP:** treat exceptionally well, proactive support, early access to new features
- **60-79 — Healthy:** normal operations
- **40-59 — At risk:** retention signal declining or margin negative, flag for check-in
- **0-39 — Problem:** either brand new (low retention score) or losing us money (negative margin)

**VIP dashboard at `/admin/usage/vips`:**
- Top 20 by user value score
- Columns: name, tier, value score, component breakdown (retention/engagement/revenue/margin/breadth visible as small bars), last active
- **Action buttons per user:** send thank-you email, grant extended trial, upgrade to next tier free for 30 days
- **Bulk actions:** send templated "VIP appreciation" email

**Retention early warning (folded in):** any user whose weekly AI usage drops >50% vs. their prior 4-week baseline AND whose value score is ≥60 gets a `retention_risk` alert in the main feed. This catches healthy users *before* they churn, not after.

### Phase 5 — Audit, Automated Owner Report, Polish

**New `admin_audit_log` table** captures every admin action:
- `pause_managed_ai`
- `unpause_managed_ai`
- `adjust_budget`
- `change_tier`
- `acknowledge_alert`
- `send_upgrade_email`
- `bulk_action` (with `target_count` + `action_kind` in context)
- `vip_grant` (extended trial, free upgrade, etc.)

Every admin UI action logs to this table. Visible at `/admin/audit`.

#### Monthly Automated Owner Report (Item #6)

A scheduled email sent on the 1st of each month to `ADMIN_EMAILS` summarizing the previous month. This is the owner's "one email that tells you everything" so they don't have to open the dashboard to stay on top of the business.

**Delivery:** Supabase Edge Function triggered by `pg_cron` on the 1st of each month at 9am UTC. Reuses the existing scheduled-publishing edge function pattern.

**Report contents (one HTML email):**

1. **Headline numbers:**
   - Total AI spend this month vs. last month (Δ and %)
   - Total subscription revenue this month (manual entry until BP-015 Stripe ships)
   - **Net margin** = revenue − AI spend − fixed overhead
   - Active user count vs. prior month

2. **Prompt cache savings:**
   - "$X saved via gateway caching this month" — reinforces the gateway ROI

3. **Top 5 most expensive users:**
   - Name, tier, spend, margin (positive/negative)
   - Link to their drill-down page

4. **Top 5 upsell candidates:**
   - Name, current tier, projected next-tier margin, signals fired
   - One-click "Send upgrade email" button (deep link back to the dashboard with the user pre-selected)

5. **Top 5 VIPs:**
   - Name, tier, value score, "what they're doing well"
   - Reminder to treat them well this month

6. **Abuse + reliability summary:**
   - Total alerts fired, broken down by severity
   - Budget auto-pauses this month
   - Trial abuse auto-pauses this month
   - Provider reliability: uptime %, fallback count per provider
   - Features where cost-per-outcome is trending up (watch list)

7. **Retention early warnings:**
   - Users flagged by the retention early-warning signal who haven't been contacted yet
   - "Reach out to these 4 users this week"

8. **Action items for the owner** (computed automatically):
   - "You have N unacknowledged alerts from last month — clear them."
   - "Your Creator tier is margin-negative by $X — consider a price increase or tighter budget."
   - "Image generation cost-per-published-post is 3x the average — review the feature's UX."

**Template:** lives in `supabase/functions/monthly-owner-report/template.html` with Handlebars-style placeholders. All data pulled from a single edge function query that aggregates from `ai_usage_events`, `creator_profiles`, `v_user_tier_economics`, and `ai_usage_alerts`.

**Test mode:** a "Send test report now" button on `/admin/usage` that fires the report immediately with current-month data. Useful for development and for the owner to verify the report renders correctly before the next real send.

### Tier gating

- Admin routes require `ADMIN_EMAILS` whitelist (existing behavior from `/api/admin/users/route.ts`)
- End-user usage data is always user-scoped by RLS
- A future "See your own usage" self-service page for end users is out of scope

### Explicitly deferred (considered, not in this BP)

These were on the original recommendation list but the owner decided against including them in BP-085 scope. Noted here so future planning doesn't accidentally re-scope them:

- **Item #4 — Retention early-warning as a standalone signal:** folded into Phase 4 as part of the User Value Score system (users with value score ≥60 whose usage drops >50% get a retention_risk alert). Not a separate feature.
- **Item #8 — CSV/JSON data export:** can be added later as a small add-on. Owner can query Supabase directly in the interim.
- **Item #12 — Cost-of-churn analysis:** requires historical churn data we don't have yet. Revisit after BP-015 (Stripe billing) ships and we start accumulating real downgrade/cancel events.

### Implementation phases (delivery order)

| Phase | Scope | Can ship independently? |
|---|---|---|
| **1** | `ai_usage_events` table + logger helper + wire-up to 7 AI routes. Includes cache savings + provider fallback columns. | Yes — no UI, just data collection |
| **2** | Admin dashboard: KPIs (with cache savings + success rate), main charts, reliability sub-page (errors + fallbacks), features sub-page (cost per feature ROI), per-user drill-down | Yes — read-only reports |
| **3** | Budgets + auto-pause + alert feed + rate limiter + trial abuse detection + bulk admin actions | Yes — enforcement + safety net |
| **4** | Upsell intelligence, LTV analysis, tier migration simulator, User Value Score, VIP dashboard, retention early warning | Yes — growth + retention layer |
| **5** | Audit log + monthly automated owner report edge function + HTML template + test-send button | Yes — polish + automation |

Ship Phase 1 ASAP even without the UI — the sooner we're collecting data, the sooner Phase 2 has something to show. Phases 2 and 3 can ship in parallel if desired since Phase 3's enforcement is orthogonal to Phase 2's visualization.

### Out of scope for this BP

- Self-service "My usage" page for end users — separate future BP
- Stripe/billing integration (BP-015, deferred to pre-launch)
- Per-workspace rollup (gated to Team tier existing)
- Machine-learning-based anomaly detection — simple rule-based is enough for now
- Historical backfill — we start collecting from Phase 1 ship date

### Acceptance criteria (all phases)

**Phase 1 — Data capture**
1. Every AI request logs a row to `ai_usage_events` with cost (exact from gateway, estimated for BYOK), including `cached_tokens`, `cached_savings_usd`, `attempted_providers`, and `final_provider` when the gateway supplies them
2. Logging failures never block the user-facing AI request

**Phase 2 — Admin dashboard**
3. `/admin/usage` shows working KPI cards (including **Prompt cache savings** and **Success rate**), filters, and all 5 chart types with real data
4. `/admin/usage/reliability` shows error rates per provider + fallback counts, with a warning banner when a provider drops below 95% uptime
5. `/admin/usage/features` shows cost-per-feature with downstream engagement metrics (e.g. image gen cost per published-with-image post)
6. `/admin/usage/[userId]` drill-down shows the user's monthly cost, cache savings, provider mix, heatmap, and action buttons

**Phase 3 — Enforcement + safety net**
7. Owner can set a per-user budget override and the system enforces it
8. A user exceeding their budget is auto-paused, can't hit managed AI, and appears in the alert feed
9. Rate limiter rejects requests that exceed 20/min or 200/hour with a 429 response, before the budget check runs
10. Trial abuse heuristics fire signup-time and first-AI-request-time alerts; high-confidence triggers auto-pause with `pause_reason='trial_abuse'`
11. Bulk admin actions (pause, unpause, adjust budget, send email, change tier, acknowledge alerts) work on multi-selected users, each logged individually to `admin_audit_log`
12. Pause/unpause actions are logged to audit

**Phase 4 — Upsell + VIP**
13. Upsell dashboard lists ranked candidates with projected-next-tier margin
14. Tier migration simulator updates projected revenue and margin live when the slider moves
15. `/admin/usage/vips` shows top 20 users by User Value Score with a visible 5-component breakdown
16. Retention early-warning alerts fire for users with value score ≥60 whose usage drops >50% week-over-week

**Phase 5 — Audit + report**
17. Every admin mutation (single-user and bulk) writes a row to `admin_audit_log`
18. The monthly owner report edge function runs on schedule and delivers an HTML email to `ADMIN_EMAILS` with all 8 report sections populated from real data
19. The "Send test report now" button fires the report immediately with current-month data

**Cross-cutting**
20. All admin routes RLS + whitelist-gated
21. `tsc --noEmit` clean, lint clean
22. Verified end-to-end in the browser preview with real usage data

---

### BP-087: Published Post View (Separate Route)

**Status:** Done (2026-04-16)
**Priority:** Medium
**Source:** Owner — published posts need a dedicated view focused on analytics and review rather than editing

#### Problem
Currently, published posts open in the full post editor with AI chat, formatting toolbar, image generation, and other editing tools that aren't relevant after publishing. Users viewing published posts want to analyze performance, review what was posted, and see engagement data — not edit.

#### Requirements
1. New route: `/posts/{id}/published` — a dedicated read-only view for published posts
2. When navigating to `/posts/{id}` for a posted post, redirect to `/posts/{id}/published`
3. Published view includes:
   - Read-only post content display (LinkedIn-style preview)
   - Post metadata: date posted, publish method (direct/scheduled/manual), days live, LinkedIn URL
   - Engagement Analytics section (impressions, reactions, comments, reposts, engagements)
   - Post image display
   - Content pillars and hashtags
   - "Duplicate as Draft" button to create an editable copy
   - "Edit Original" link with warning banner ("Changes will not update the LinkedIn post")
   - "View on LinkedIn" button
4. No AI chat panel, no formatting toolbar, no auto-save, no image generation
5. Content editable with a warning banner that changes won't update the LinkedIn post
6. Future-ready: space for engagement trends, best time analysis, audience insights

#### Acceptance Criteria
- [ ] `/posts/{id}/published` route renders the published view
- [ ] `/posts/{id}` redirects to published view when post status is "posted"
- [ ] Engagement analytics section with editable metrics
- [ ] Post metadata displayed (publish date, method, days live)
- [ ] "Duplicate as Draft" creates a new draft post with the same content
- [ ] "Edit Original" navigates to the editor with warning banner
- [ ] "View on LinkedIn" opens the LinkedIn post URL
- [ ] All existing editor functionality unaffected for non-posted posts

---

### BP-086: Show Directly Published Posts on Calendar

**Status:** Done (2026-04-15)
**Priority:** Medium
**Source:** Owner — posts published directly to LinkedIn don't appear on the calendar

#### Problem
When a user develops an idea into a post (or creates a new post) and clicks "Approve & Publish" to post directly to LinkedIn rather than scheduling it, the post does not appear on the calendar. The calendar currently only shows posts with a `scheduled_for` date. Directly published posts have no `scheduled_for` value, so they are invisible on the calendar even though they have a `posted_at` timestamp.

#### Requirements
1. Posts with status "posted" and a `posted_at` timestamp (but no `scheduled_for`) should appear on the calendar on the date they were published
2. These posts should be visually distinct from scheduled posts (e.g., different color/badge indicating "Posted" vs "Scheduled")
3. The calendar query needs to include posts where `status = 'posted'` and `posted_at IS NOT NULL`, in addition to the current `scheduled_for IS NOT NULL` filter
4. Clicking a directly-published post on the calendar should show the same preview behavior as scheduled posts
5. The Upcoming Posts panel should NOT include already-posted posts (it should remain forward-looking)

#### Acceptance Criteria
- [ ] Directly published posts appear on the calendar on their `posted_at` date
- [ ] Posts are visually distinguished (e.g., green "Posted" badge vs purple "Scheduled")
- [ ] Calendar month/week/day views all show posted posts
- [ ] Hover preview works for posted posts with "Edit" button (no "Reschedule")
- [ ] Upcoming Posts panel is unaffected (still only shows future scheduled posts)

---

<!-- =================================================================== -->
<!-- BP-088 through BP-097 added by 48-hour system review on 2026-04-16. -->
<!-- See docs/reviews/2026-04-16-system-review.md for context.            -->
<!-- All entries tagged: Source: [2026-04-16 Review]                      -->
<!-- =================================================================== -->

### BP-088: Authorization Audit on Team-Feature API Routes

**Status:** Backlog (scope to Free/Pro endpoints first; Team-only endpoint hardening waits for BP-098 unflag)
**Priority:** P0 / Critical (scoped to Free/Pro)
**Re-prioritized:** 2026-04-16 — keep Critical for endpoints reachable by Free/Pro users. Team-only endpoints become safer once BP-098 hides their UI; full Team audit defers until Team unflags.
**Source:** [2026-04-16 Review] — Code Review team finding C1, C3
**Date Added:** 2026-04-16

#### Problem
Two team-feature API endpoints have insufficient authorization checks. Both shipped in commits `fd913e5` and `97ec2a0`.

1. **`DELETE /api/posts/assign`** at [src/app/api/posts/assign/route.ts:88-124](../src/app/api/posts/assign/route.ts) — fetches the post's `workspace_id` but never verifies the caller is a workspace member or post owner before unassigning. Any authenticated user can unassign any post by ID. The `POST` handler in the same file does check membership at lines 33-44; the `DELETE` handler must mirror it.
2. **`PATCH /api/posts/comments`** at [src/app/api/posts/comments/route.ts:131-158](../src/app/api/posts/comments/route.ts) — relies entirely on RLS for resolve/unresolve authorization. No defense-in-depth check that the caller is the comment author OR workspace owner/admin.

#### Requirements
1. `DELETE /api/posts/assign`: Add the same workspace membership check as the `POST` handler before performing the update.
2. `PATCH /api/posts/comments`: Add an explicit role/authorship check before the update (caller must be comment author OR workspace owner/admin).
3. Audit all other team-feature endpoints created in this sprint for missing application-level authorization:
   - `/api/posts/approval` (POST and GET)
   - `/api/posts/comments` (DELETE — already checks `eq("user_id", user.id)`, OK)
   - `/api/notifications` (all methods)
   - `/api/activity` (GET)
   - `/api/workspace/members` (GET, PATCH, DELETE)
   - `/api/workspace/invite`
4. Document in code review checklist: "all new endpoints must check authorization at the application layer, not rely solely on RLS."

#### Acceptance Criteria
- [ ] DELETE /api/posts/assign returns 403 for non-members
- [ ] PATCH /api/posts/comments returns 403 when caller is neither author nor owner/admin
- [ ] Manual test of all listed endpoints confirms application-layer authorization
- [ ] Add a brief note to CLAUDE.md (if it exists) about defense-in-depth requirement

---

### BP-089: Approval Workflow Status Transitions

**Status:** Backlog
**Priority:** Deferred (Team) — was Critical
**Re-prioritized:** 2026-04-16 — bug exists but only affects Team users; behind BP-098 flag, no users exposed. Fix when Team unflags.
**Source:** [2026-04-16 Review] — Code Review + UI/UX team finding C2, P1
**Date Added:** 2026-04-16

#### Problem
The approval decision handler at [src/app/api/posts/approval/route.ts:144-150](../src/app/api/posts/approval/route.ts) contains dead-code logic:

```ts
const newStatus = decision === "approved" ? "draft" : "draft"; // approved moves forward, changes_requested goes back to draft
```

Both branches resolve to `"draft"`. The comment says "approved moves forward" but the code does not move it forward. As a result, an approved post ends up with `status="draft"` and `approval_status="approved"` — there is no `"ready"` state, and no clear next-step UI for the editor.

#### Requirements
1. Define a new post status `"ready"` (or similar) in the post status enum / type definitions.
2. Update the approval handler so `decision === "approved"` sets `status="ready"`.
3. Update the post editor to show a clear "Ready to Publish" affordance when `status="ready"`:
   - Visible badge in the top bar
   - "Schedule" and "Publish Now" buttons surfaced prominently
   - Clear CTA: "This post has been approved. Publish or schedule to send it live."
4. Update calendar/dashboard queries that filter on `status` to include `"ready"` posts in the appropriate views.
5. Update the activity feed labels so "post_approved" reads naturally with the new status.
6. Optional: when approval is granted, send the author a notification with the title "Your post is ready to publish."

#### Acceptance Criteria
- [ ] Approving a post sets `status="ready"` and `approval_status="approved"`
- [ ] Requesting changes sets `status="draft"` and `approval_status="changes_requested"`
- [ ] Post editor shows "Ready to Publish" UI when in `ready` status
- [ ] Author receives notification when their post is approved (with correct deep-link, see BP-093)
- [ ] No existing flows break (drafts, scheduled, posted statuses unchanged)

---

### BP-090: Eliminate `window.location.reload()` from Post Editor

**Status:** Backlog
**Priority:** Deferred (Team) — was Critical
**Re-prioritized:** 2026-04-16 — both reload sites are in Team-only post editor sections (ApprovalControls onChange, SubmitForReviewDialog onSubmitted). Behind BP-098 flag. Fix when Team unflags.
**Source:** [2026-04-16 Review] — UI/UX team finding C4
**Date Added:** 2026-04-16

#### Problem
Two locations in [src/app/(app)/posts/[id]/page.tsx](../src/app/(app)/posts/[id]/page.tsx) trigger a full page reload after approval actions:
- Line 1520: `<ApprovalControls onChange={() => window.location.reload()} />`
- Line 2276: `onSubmitted` callback in SubmitForReviewDialog

Each reload wipes:
- Tabbed right-panel preference (briefly resets and re-applies from localStorage, causing flicker)
- AI Assistant chat conversation
- Scroll position
- In-progress edits not yet auto-saved (10-second debounce window)

Reviewers will encounter this every time they approve or request changes. It feels broken.

#### Requirements
1. Replace both `window.location.reload()` calls with proper state refresh:
   - Re-fetch the post record via Supabase and update local state
   - Re-fetch the approval history (already done by ApprovalControls when it re-renders)
   - Trigger an Activity tab refresh if it's currently visible
2. Use Next.js `router.refresh()` if the post page has any server-component children that need to revalidate.
3. Add a brief visual confirmation (toast or status badge change animation) so the user knows the action succeeded.

#### Acceptance Criteria
- [ ] Approving a post does not reload the page
- [ ] Submitting for review does not reload the page
- [ ] Post status, approval_status, and approval history all update correctly without reload
- [ ] AI chat conversation persists after approval actions
- [ ] No regressions in tabbed panel persistence

---

### BP-091: Approval UX — Visible Controls, Empty-State CTAs, Role Help

**Status:** Backlog
**Priority:** Deferred (Team) — was High
**Re-prioritized:** 2026-04-16 — Team-only UX. Behind BP-098 flag.
**Source:** [2026-04-16 Review] — UI/UX team findings H1, H2, M3
**Date Added:** 2026-04-16

#### Problem
Three related UX gaps in the team-collaboration UI:

1. **ApprovalControls visibility unclear after tabbed panel refactor (562fa0a):** The Comments and Activity panels were moved to tabs, but the inline `ApprovalControls` card was supposed to remain. Manual walkthrough is needed to confirm reviewers can act on pending approvals from the editor (the only documented path is `/workspace/reviews`).
2. **"No eligible reviewers" dialog dead-end:** When the workspace has no other members with review-eligible roles, [src/components/posts/submit-for-review-dialog.tsx](../src/components/posts/submit-for-review-dialog.tsx) shows the message but offers only Cancel. No deep-link to invite or to manage roles.
3. **Reviewer role model is invisible:** The hierarchy (owner > admin > editor > member > viewer) and "only owner/admin/editor can review" rule is enforced in code but never explained to users in-product.

#### Requirements
1. Confirm or restore visible `ApprovalControls` in the post editor for workspace posts. If the existing inline placement is hard to spot, consider adding "Approvals" as a fourth tab in the right panel.
2. In the "No eligible reviewers" empty state of `SubmitForReviewDialog`, add an "Invite Member" button that links to `/workspace/members` (or opens an invite dialog directly).
3. Add a "Roles & Permissions" help card on `/workspace/members` (collapsible) explaining each role's capabilities, especially review eligibility.
4. Add a brief tooltip on the "Submit for Review" button explaining "Editors, admins, and owners can be picked as reviewers."

#### Acceptance Criteria
- [ ] Reviewers can see and act on pending approvals from the post editor without leaving the page
- [ ] Empty reviewer dialog has a clear next-action button
- [ ] Members page explains the role model
- [ ] Submit-for-review button has a helpful tooltip

---

### BP-092: LinkedIn Analytics — Gate UI on Scope Grant

**Status:** Done (2026-04-22)
**Priority:** P1 / High
**Re-prioritized:** 2026-04-16 — confirmed P1. Affects Creator/Pro users today; without gating, every "Refresh from LinkedIn" click fails. Sprint 2.
**Source:** [2026-04-16 Review] — System Logic + UI/UX teams finding H3
**Date Added:** 2026-04-16
**Completed:** 2026-04-22 — replaced the "Reconnect LinkedIn" dead-end with an honest "Auto-sync coming soon" message (reconnecting wouldn't help — LinkedIn hasn't approved our analytics scope yet). Added a data-source badge on the engagement card: blue "Synced from LinkedIn · [timestamp]" when fetched, gray "Manually entered" when user-entered. Connect button preserved for users who aren't connected at all (still useful for publishing).

#### Problem
BP-025 is explicitly blocked on LinkedIn app approval for the `r_member_postAnalytics` scope. However, BP-087 (Published Post View) shipped a "Refresh from LinkedIn" button that calls the gated endpoint. For every user today, this button will fail. The published post view also presents engagement metrics with no indication of whether the values came from LinkedIn or were entered manually.

Users will think the feature is broken instead of pending.

#### Requirements
1. Hide the "Refresh from LinkedIn" button entirely until the user's `linkedin_scopes` includes `r_member_postAnalytics`. Replace with a small "Coming soon: auto-refresh from LinkedIn" note (linked to a help article).
2. Add a "Manual entry" badge or label on the engagement analytics card while LinkedIn auto-fetch is unavailable.
3. When `analytics_fetched_at` is set on a post, show "Last fetched from LinkedIn: [relative time]" on the analytics card. When null, show "Manually entered" with timestamp.
4. Add a Settings → LinkedIn note: "Engagement analytics auto-refresh requires additional LinkedIn permissions. We'll enable this in a future update."

#### Acceptance Criteria
- [ ] Refresh button hidden when scope is missing
- [ ] Engagement card clearly indicates data source (LinkedIn vs manual)
- [ ] Settings page explains the pending feature
- [ ] When/if scope is granted, the existing implementation activates automatically

---

### BP-093: Notification Deep-Links + Workspace Context Indicator

**Status:** Backlog
**Priority:** Deferred (Team) — was High
**Re-prioritized:** 2026-04-16 — Team-only UX (notifications + workspace badge). Behind BP-098 flag.
**Source:** [2026-04-16 Review] — UI/UX team findings H4, M4
**Date Added:** 2026-04-16

#### Problem
Two UX context issues:

1. **Notifications don't deep-link to context.** All notifications use `action_url: "/posts/${postId}"`. A "you were mentioned in a comment" notification opens the post editor on whatever tab the user last had open (might be AI Assistant) — not the comment thread.
2. **No workspace context indicator in top bar.** Once a Team user is in a workspace, only the sidebar workspace switcher shows which workspace they're in. With sidebar collapsed, users can't tell which workspace they're editing in.

#### Requirements
1. Update notification creation in `/api/posts/comments/route.ts` and `/api/posts/approval/route.ts`:
   - Mention notifications: `action_url: /posts/${postId}?panel=comments#comment-${commentId}`
   - Comment notifications (post owner/assignee): `action_url: /posts/${postId}?panel=comments`
   - Approval decision notifications: `action_url: /posts/${postId}?panel=activity`
2. Update post editor to read `?panel=` query param on mount and open the correct tab (overriding the localStorage default for that page load only).
3. Add a workspace name pill to the top bar (next to status/search) when an active workspace is set. Click to open workspace switcher.
4. On the post editor, add a small workspace breadcrumb above the title.

#### Acceptance Criteria
- [ ] Mention notifications open Comments tab and scroll to the right comment
- [ ] Approval notifications open Activity tab
- [ ] Top bar shows workspace name when active
- [ ] Post editor shows workspace context in header

---

### BP-094: Route-Level Tier Gating for Workspace + Notification Routes

**Status:** Backlog (folded into BP-098)
**Priority:** P0 / Critical — was High
**Re-prioritized:** 2026-04-16 — promoted. Now central to the Team-features feature-flag strategy. Implementation merges with BP-098.
**Source:** [2026-04-16 Review] — System Logic team finding H5
**Date Added:** 2026-04-16

#### Problem
Team-tier features are gated at the component level (`hasFeature(userTier, "workspaces")`), but routes like `/workspace/reviews`, `/workspace/members`, `/notifications`, and `/activity` are accessible by URL to Free, Creator, and Pro users. They see broken or empty pages.

#### Requirements
1. Add tier check at the layout or middleware level. If `!hasFeature(userTier, "workspaces")` and pathname starts with `/workspace/`, `/notifications`, or `/activity`, redirect to `/pricing?upgrade=workspaces` (or to the dashboard with a friendly toast).
2. Alternatively, render a "Team-tier feature" upsell page on these routes for non-Team users instead of redirecting.
3. Audit the sidebar / mobile nav to ensure these items are also hidden for non-Team users (check that they already are; if not, fix).

#### Acceptance Criteria
- [ ] Free/Creator/Pro users cannot access `/workspace/*`, `/notifications`, `/activity` directly
- [ ] Sidebar/mobile-nav consistently hides these for non-Team users
- [ ] Upsell or redirect provides clear value proposition

---

### BP-095: Observability — Kill Silent Failures + Workspace Filter Audit

**Status:** Backlog
**Priority:** P0 / High — was Medium
**Re-prioritized:** 2026-04-16 — promoted to P0. Foundation for catching real issues during alpha/beta testing. Apply across the codebase, not just Team helpers.
**Source:** [2026-04-16 Review] — Code Review team findings M1, M2
**Date Added:** 2026-04-16

#### Problem
Two observability/maintainability issues introduced by the team-collaboration shipping:

1. **Silent failures in helpers.** [src/lib/activity.ts:41-43](../src/lib/activity.ts) catches all errors with `catch {}`. Same pattern in `src/lib/notifications.ts`. If RLS or schema changes break these helpers, no telemetry will surface the problem until users complain.
2. **Inconsistent workspace scoping.** `applyWorkspaceFilter()` is the canonical helper but isn't used uniformly. Some queries manually filter on `workspace_id`. Risk of drift — a future write path could miss the filter and silently leak data across tenants.

#### Requirements
1. Update silent-catch blocks in `lib/activity.ts` and `lib/notifications.ts` to call `logApiError()` (or at minimum `console.error` with a labeled prefix like `[activity-log]`) before returning silently. Don't change the "best-effort, never block" semantics — just make failures visible.
2. Audit all server-side queries on `posts`, `ideas`, and any other workspace-scoped tables for consistent use of `applyWorkspaceFilter()`. Document any exceptions.
3. Add a brief comment in `src/lib/workspace.ts` explaining when to use the helper vs manually filter.
4. Consider an ESLint rule or grep-based check to catch direct `.from("posts")` queries that don't use the helper.

#### Acceptance Criteria
- [ ] Failed activity-log inserts produce a console error
- [ ] Failed notification inserts produce a console error
- [ ] All `posts` and `ideas` server queries use `applyWorkspaceFilter` (or have a documented exemption)
- [ ] Helper documentation updated

---

### BP-096: Approval Deadlines + Reviewer Reminders

**Status:** Backlog (deferred to Phase T4)
**Priority:** Medium
**Source:** [2026-04-16 Review] — System Logic team finding M5
**Date Added:** 2026-04-16

#### Problem
A post submitted for review can sit in `status="review"` indefinitely. There is no deadline tracking, no automatic reminder to reviewers, and no escalation path. For Team-tier customers running real publishing workflows, this is a noticeable gap — content gets stuck.

#### Requirements
1. Add an optional `approval_deadline` field to `posts` (timestamp, nullable).
2. Allow editor to set a deadline when submitting for review.
3. Daily cron / Edge Function: notify reviewers about pending approvals approaching deadline (24h, 4h before).
4. Optional: escalation policy — if no decision after a configurable threshold, notify workspace admins.
5. Show countdown badge on review queue and post editor.

#### Acceptance Criteria
- [ ] Editors can set an optional deadline on submission
- [ ] Reviewers receive reminder notifications as deadline approaches
- [ ] Admins notified on overdue (configurable)

#### Notes
This is a Phase T4 enhancement per ROADMAP. Listed here as a tracked deferred item from the 2026-04-16 review.

---

### BP-097: Playwright E2E for Free→Pro Happy Path

**Status:** Backlog
**Priority:** P1 / High
**Re-prioritized:** 2026-04-16 — re-scoped from Team-collaboration E2E to Free→Pro happy path. The Team test waits behind BP-098.
**Source:** [2026-04-16 Review] — Lead synthesis improvement opportunity I4 (re-scoped)
**Date Added:** 2026-04-16

#### Problem
The Free→Pro happy path is the entire product right now (Team is feature-flagged). It touches signup, onboarding, LinkedIn OAuth, AI brainstorm, idea-to-post flow, scheduling, publishing, and analytics — but has zero automated test coverage. Regressions during the upcoming Sprints 1-4 are likely.

#### Requirements
1. Set up Playwright (if not already configured) targeting the deployed Vercel preview URL (per project workflow — no localhost).
2. Write a single happy-path E2E test for the solo creator that covers:
   - Sign up with new email (or use a test account fixture)
   - Complete onboarding (Individual Creator path; Brand/Team should not appear when BP-098 flag is off)
   - Connect LinkedIn (mock OAuth callback or use a sandbox app)
   - Brainstorm ideas (assert ≥1 idea generated)
   - Develop an idea into a post (navigate to editor)
   - Use AI to generate a draft (assert content populated)
   - Schedule the post for a future time
   - Verify it appears on the calendar
   - Mark as posted (manual flow, since real LinkedIn publish in tests is risky)
   - Enter manual analytics numbers (BP-021 prereq)
3. Run the test on every PR to `develop` branch via GitHub Actions or Vercel preview hook.
4. Document how to add new E2E tests in a brief README.
5. Future: add a Team-suite E2E test once BP-098 is unflagged.

#### Acceptance Criteria
- [ ] Playwright configured and running against preview deployments
- [ ] Free→Pro happy-path test covers all listed steps
- [ ] Test runs in CI (under 5 minutes)
- [ ] No Team-only UI elements appear during the Free→Pro flow
- [ ] Documentation added for future test contributors

---

### BP-098: Team Features Master Feature Flag

**Status:** Backlog
**Priority:** P0 / Critical
**Source:** [2026-04-16 Reprioritization] — Strategic pivot to Free→Pro focus
**Date Added:** 2026-04-16

#### Problem
The Team-collaboration suite (BP-023, BP-046–051, BP-087, plus supporting work) shipped in the last 48 hours: ~3,000 LOC across components, API routes, migrations, helpers, types, and nav items. The owner has decided to defer billing and focus on validating the Free→Pro experience. Until that validation is complete, all Team-tier UI must be hidden from Free, Creator, and Pro users so they don't encounter incomplete or confusing workflows.

We need a single flag that turns the entire Team suite off for end users while keeping the code in place for later activation.

#### Requirements

**Layer 1: Master Environment Flag**
- Define `NEXT_PUBLIC_TEAM_FEATURES_ENABLED` env var (default: `"false"`)
- Expose via a typed helper:
  ```ts
  // src/lib/feature-flags.ts
  export const TEAM_FEATURES_ENABLED =
    process.env.NEXT_PUBLIC_TEAM_FEATURES_ENABLED === "true";
  ```

**Layer 2: Modify `hasFeature()` to short-circuit (depends on BP-018)**
- When the master flag is off, any check for a Team-tier feature returns `false` regardless of the user's actual tier
- Identify the list of Team-feature keys (workspaces, comments, activity feed, notifications, approval, review queue, etc.) and short-circuit them centrally

**Layer 3: Route-level redirect (folds in BP-094)**
- Middleware or layout-level redirect for `/workspace/*`, `/notifications`, `/activity` when flag is off
- Redirect target: `/dashboard` (with optional toast: "This feature isn't available in your plan.")

**Layer 4: Hide nav items**
- Sidebar and mobile nav filter out Activity, Reviews, Notifications when flag is off
- Top bar: hide notifications bell when flag is off

**Layer 5: Onboarding workspace-type selector**
- `/onboarding/type` route: hide the "Brand/Team" option entirely when flag is off (or auto-skip the route and route directly to LinkedIn-connect step)

**Layer 6: Settings → Workspace setup wizard**
- Hide entirely when flag is off

#### What Stays Visible
- Database schema and migrations remain in place (no rollback needed; tables are inert without the UI)
- API routes remain in code; they require Team-tier auth so Free/Pro users cannot reach them by URL
- Pricing page (BP-017) keeps Team tier listed for transparency, but with "coming soon" badge

#### Acceptance Criteria
- [ ] `NEXT_PUBLIC_TEAM_FEATURES_ENABLED=false` (default) hides all Team UI
- [ ] Sidebar shows only: Dashboard, Ideas, Posts, Calendar, Analytics, Settings
- [ ] Mobile nav matches sidebar
- [ ] Top bar: no notifications bell
- [ ] Post editor: no Comments/Activity tabs, no assignment card, no approval controls, no Submit-for-Review button
- [ ] Onboarding: Brand/Team option hidden or skipped
- [ ] URL `/workspace/reviews`, `/workspace/members`, `/notifications`, `/activity` all redirect to `/dashboard`
- [ ] No 500 errors in any flag-off code path
- [ ] Free, Creator, Pro tier users can complete the full create→publish loop without encountering Team UI
- [ ] Setting `NEXT_PUBLIC_TEAM_FEATURES_ENABLED=true` restores the Team experience exactly as today (no functional changes when the flag is on)

#### Notes
- This is the **gating BP** for the new strategic direction. Land this first; everything else depends on it.
- Pair the work with a quick smoke test of all Free/Pro flows to confirm nothing leaks Team UI.
- After BP-098 lands, BP-094 is mostly subsumed but kept open as a tracking item for the route-level work.

---

### BP-100: Scheduled Posts Drop Images (Edge Function Out of Sync)

**Status:** Backlog — confirmed bug
**Priority:** P1 / Critical (production data loss for owner; affects every Free→Pro user who schedules with images)
**Source:** Owner bug report 2026-04-16 (multiple LinkedIn posts published without images)
**Date Added:** 2026-04-16

#### Problem
Scheduled posts published via the Supabase Edge Function never attach the user's selected image to the LinkedIn post. The image is correctly saved on the post record (`posts.image_url`), but the Edge Function silently drops it.

#### Root cause
The Edge Function (`supabase/functions/publish-scheduled-posts/index.ts`, currently deployed v14) was written before image support was added to the app and has not been updated since image upload shipped (commit `3579da8`, BP-029/BP-039/BP-041). Specifically:

1. **The SELECT query omits `image_url`** ([index.ts:261](../supabase/functions/publish-scheduled-posts/index.ts)):
   ```ts
   .select("id, title, content, hashtags, user_id, publish_attempts")
   ```
2. **The Edge Function's embedded `publishToLinkedIn()`** ([index.ts:98-150](../supabase/functions/publish-scheduled-posts/index.ts)) accepts no `imageUrn` parameter and never adds `content.media.id` to the LinkedIn payload.
3. **There is no `uploadImageToLinkedIn()` Deno port** in the function. The Node version exists in `src/lib/linkedin-api.ts` but cannot be imported by Deno directly.

This means scheduled posts go out as text-only, even when the manual ("Publish Now") path correctly attaches images via `src/app/api/linkedin/publish/route.ts`.

#### Confirmation (database evidence, 2026-04-16)
The 4 most recent scheduled posts that successfully published all had `image_url` set in the database, but the LinkedIn versions had no image:
- 2026-04-16 — "The App Attack Vector / Threat Surface" (image present in DB, missing on LinkedIn)
- 2026-04-14 — "Listening as a Superpower" (image present in DB, missing on LinkedIn)
- 2026-04-09 — "The Real Test of Customer Loyalty" (image present in DB, missing on LinkedIn)
- 2026-04-07 — "Hidden Vendor Risk" (image present in DB, missing on LinkedIn)

#### Requirements
1. Add `image_url` to the SELECT in the Edge Function's scheduled-posts query.
2. Port `uploadImageToLinkedIn()` from `src/lib/linkedin-api.ts` to Deno (uses Web Crypto and `fetch` — already cross-runtime).
3. Update the Edge Function's `publishToLinkedIn()` to accept an optional `imageUrn` and include it in the payload when present:
   ```ts
   if (imageUrn) {
     postBody.content = { media: { id: imageUrn } };
   }
   ```
4. Wrap the image upload in its own try/catch — if image upload fails, log the error but proceed with a text-only publish (don't fail the whole post). Mirror the manual route's behavior.
5. Re-deploy the Edge Function via Supabase MCP `deploy_edge_function`.
6. Verify on the next scheduled run by checking that the LinkedIn post URL has the image attached.

#### Acceptance Criteria
- [ ] Edge Function v15 deployed
- [ ] A scheduled post with `image_url` set publishes to LinkedIn with the image attached
- [ ] A scheduled post without `image_url` still publishes successfully (text-only)
- [ ] If image upload to LinkedIn fails, the post still publishes text-only and the error is logged in `publish_error`
- [ ] Tony manually verifies on his next scheduled post

#### Out of scope
- BP-101 (potential text-truncation bug) — separate watch item, not yet reproducible
- Backfilling images on already-published posts — Tony has manually corrected those on LinkedIn

#### Notes
- This bug exposes a structural issue: the Edge Function is a parallel implementation of the publish logic in `src/lib/linkedin-api.ts`. Every time the Node-side publish flow gains a feature (images, link previews, video, polls in the future), the Deno-side Edge Function must be updated in lockstep. Consider as a follow-up: extract the LinkedIn payload builder into a small file shared between Deno and Node (or refactor the Edge Function to call the Next.js publish route via service-key auth so there is one publish path). Out of scope for this fix; capture as a tech-debt note.

---

### BP-101: LinkedIn Text Truncation on Unescaped Reserved Characters

**Status:** Done (2026-04-22, Edge Function v16 + src/lib/linkedin-api.ts)
**Priority:** P1 / Critical — was P2 / Watching
**Source:** Owner bug report 2026-04-16, reproduced + root-caused 2026-04-22
**Date Added:** 2026-04-16
**Completed:** 2026-04-22

#### Problem
Scheduled posts containing certain reserved characters (most commonly parentheses `(` and `)`) were silently truncated by LinkedIn at publish time. The full post content was stored correctly in the database, but LinkedIn's REST Posts API only published the text up to (but not including) the first unescaped reserved character. This looked like random partial publishing because it only affected posts that happened to contain those specific characters.

#### Reproduction (2026-04-21)
Post `397308f9-d142-4388-9c2f-fe6946edb2b6` ("3 Practices That Make Lifelong Learning Stick") was scheduled for 2026-04-21 17:00 UTC and published via Edge Function v15. Database stored the full 1,614-char body; LinkedIn published only the text up to "3. Never stop seeking feedback" — cutting off exactly before `  (this one is key)❗` (the first unescaped `(` in the post). Remaining ~720 chars were silently dropped. Published URL: `https://www.linkedin.com/feed/update/urn:li:share:7452400769162514432/`.

Owner manually corrected the live LinkedIn post.

#### Root cause
LinkedIn's REST Posts API `commentary` field uses the "Little Text Format" (LTF) — a mini-markup grammar for mentions, hashtags, and hashtag templates. Per LinkedIn's [LTF specification](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format), the following characters are RESERVED and must be backslash-escaped when they appear as literal text:

> `|  {  }  @  [  ]  (  )  <  >  #  \  *  _  ~`

The spec explicitly states: "All reserved characters need to be escaped with a backslash, **even if those characters are not used in one of the supported elements or templates.**"

When unescaped, LinkedIn silently truncates the `commentary` at the first unexpected reserved character — no error, no warning, status 200 returned. This explained every historical symptom the owner had reported:
- "Cut short to about 1/3 of the text" — posts with `(`, `[`, `{` early in the body
- "Full text went through" — posts without any reserved characters
- "Almost as if the system only published what you see in the preview" — the truncation point happened to be where the preview's "see more" fold is

Neither the Edge Function (`publish-scheduled-posts/index.ts`) nor the manual-publish route (`src/app/api/linkedin/publish/route.ts`) was escaping reserved characters before sending the `commentary` field.

#### Fix
Added a shared helper `escapeLinkedInText()` in both the Deno Edge Function and `src/lib/linkedin-api.ts` (Node). The helper:

1. **Escapes backslashes first** so we don't double-escape our own escapes.
2. **Escapes all other reserved chars** (`|{}@[]()<>*_~`) with a prefix `\`.
3. **Special-cases `#`**: escapes only when NOT followed by a word character. So `#leadership` stays as a hashtag (linked), but `rank # 1` becomes `rank \# 1` (literal).

Applied to both user-provided `title` and `content` before they're combined into the LinkedIn payload. The explicit `hashtags` array is NOT escaped — those are already in the `#tag` form and must remain unescaped for LinkedIn to render them as hashtag links.

#### Deployment
- **Edge Function v16** deployed to Supabase project `rgzqhyniuzhqfxqrgsdd` via MCP on 2026-04-22.
- **Node lib** change lands with this commit; takes effect on the next Vercel deploy.
- Previously affected posts on LinkedIn: owner manually corrected each one at the time; no backfill needed.

#### Acceptance Criteria
- [x] Root cause identified and confirmed via LinkedIn's own LTF spec
- [x] `escapeLinkedInText()` helper implemented in both runtimes with docstring linking to the spec
- [x] Escape applied to `content` and `title` in both Edge Function and manual-publish paths
- [x] `#hashtag` patterns preserved as linked hashtags (not escaped)
- [x] Edge Function v16 deployed and healthy
- [x] `tsc --noEmit` clean
- [ ] Owner validation: next scheduled post with `(`, `[`, `{`, etc. in the body publishes the full text on LinkedIn

#### Notes
- Hypotheses #1–3 in the original BP-101 (older Edge Function version bug, auto-save race, "see more" visual fold) are all now disproven. The actual cause was a LinkedIn API contract issue that has been present since day one of scheduled publishing.
- The two copies of `escapeLinkedInText()` (Deno + Node) must stay in sync. When Node-side LinkedIn payload construction changes in `src/lib/linkedin-api.ts`, mirror the change in `supabase/functions/publish-scheduled-posts/index.ts`. This is the same structural tech-debt noted in BP-100 (parallel publish implementations across runtimes).

---

### BP-099: Simplified Guided UI Mode (Conversational Assistant)

**Status:** Backlog
**Priority:** P1 / High
**Source:** Owner — captured 2026-04-16. Idea originated in a prior session and was not previously written into the backlog.
**Date Added:** 2026-04-16

#### Vision

A toggleable "Guided Mode" that turns PostPilot's UI into a full-time conversational assistant for less technical users. Instead of presenting the full, dense product surface and expecting the user to know what to do, the system proactively asks the user what they want to accomplish, walks them through the workflow step by step, and — after each completed task — asks "what would you like to do next?" with a curated, context-aware set of options.

The simplified mode does **not** replace the existing UI. It overlays/augments it: real components (Idea Generator modal, Post Editor, AI Assistant panel, Schedule modal, etc.) are still used. The Guided Mode adds an always-present assistant that narrates, prompts, and confirms. Power users can keep the standard UI; less technical users get a coached experience.

This addresses a clear gap: PostPilot has many features, and a brand-new, non-technical user can be overwhelmed before they ever publish their first post. Guided Mode is the difference between "I tried it and gave up" and "It walked me through it and I posted in 5 minutes."

#### Problem

PostPilot has accumulated significant surface area: voice profile setup, BYOK or managed AI, content pillars, Idea Bank, post editor with AI chat / hook analyzer / version management / hashtag tools / image generation, calendar, analytics, and now (when re-enabled) team workspaces. For a less technical user, knowing **where to start** and **what to do next** is the primary obstacle. Documentation, tooltips, and one-shot tutorials help but aren't enough — the user needs an assistant that stays with them throughout the session, not just on first login.

#### Canonical Walkthrough (Owner's Reference Example)

> **System on login:** "What would you like to do?" Options: *Create a new AI-assisted post · Brainstorm new ideas · Schedule a post · View my analytics · Manage my settings*
>
> **User selects:** "Create a new AI-assisted post"
>
> **System:** Opens the AI Idea Generator modal. "First, tell me what you'd like to brainstorm about. Enter a topic and pick a content pillar, then click Generate." (User-facing prompts highlight the topic field and the pillar selector.)
>
> **User:** Enters topic, picks pillar, clicks Generate.
>
> **System:** AI generates ideas. "Great — here are some ideas. Pick at least one you'd like to develop later and add it to your Idea Bank."
>
> **User:** Selects ideas, saves to Idea Bank. The Idea Generator closes.
>
> **System:** Navigates the user to the Idea Bank. "Which of these ideas would you like to develop into a LinkedIn post? Click the Develop button on the one you want to start with."
>
> **User:** Clicks Develop on an idea. The post editor opens with the idea pre-populated. The AI Assistant starts writing the initial draft automatically.
>
> **System:** "I'm drafting your post in the AI Assistant panel on the right. When it's done, you can review it. If you want changes, just ask the AI assistant — or click 'Apply to Editor' to take over and edit it yourself."
>
> **User:** Reviews draft, applies it to editor, makes any edits.
>
> **System:** "Looking good! Want to add an image? You can generate one with AI or upload your own from the Post Image section. If you'd rather skip the image, you can move on."
>
> **User:** Generates/uploads an image, OR skips.
>
> **System:** "Ready to share? You can publish to LinkedIn right now, or schedule it for a later date and time."
>
>   - **If user chooses "Publish now":** System publishes via LinkedIn integration. "🎉 Your post is live on LinkedIn! Want to start another one?"
>   - **If user chooses "Schedule":** Schedule modal opens. User picks date/time. "🎉 Scheduled for [date/time]. Want to start another one?"

This canonical example becomes the reference implementation for the V1 "Create a new AI-assisted post" workflow. Other workflows follow the same pattern.

#### Requirements

##### 1. Guided Mode Toggle
- Settings → New section "Guided Mode" with a master toggle (default: **on for new accounts**, **off for existing accounts** at rollout)
- A subtle but persistent indicator in the UI when Guided Mode is active (e.g., a small assistant chip in the top bar)
- Easy way to dismiss/disable from inside any guided step ("Skip guidance · I'll explore on my own") that turns Guided Mode off and remembers the preference
- Easy way to re-enable from Settings or from a Help menu item

##### 2. Conversational Assistant Panel
- A persistent assistant surface (slide-out panel, bottom drawer, or floating chip — design choice during implementation)
- Renders as a chat-like conversation: system messages, suggested action buttons, and confirmation messages
- When the user takes a suggested action (clicks a real UI element), the assistant detects it and advances the conversation
- When the user goes off-script (clicks something outside the suggested flow), the assistant gracefully acknowledges and offers to either continue with the original goal or pivot

##### 3. Workflow Engine
A state machine that drives guided sessions. Each workflow is a sequence of steps with:
- A user-facing prompt
- An expected user action (click, navigate, form-input, "task complete" signal)
- A success message + a "what next?" branch with context-aware options
- A "skip this step" affordance
- A timeout/help fallback ("Need help finding it?")

Reuse the action-detection patterns already built for the Tutorial SDK (`packages/tutorial-sdk/src/core/action-detector.ts`) — click, navigate, formInput, elementExists detectors are already battle-tested.

##### 4. Workflow Catalog (V1 Scope)
Ship V1 with these workflows. Each is one full guided journey from "what do you want to do?" through "congratulations, you did it":

| Workflow | Trigger | End state |
|---|---|---|
| **Create a new AI-assisted post** (canonical example above) | Login menu, post-completion menu, dashboard CTA | Post published or scheduled |
| **Brainstorm new ideas without developing** | Login menu, idea bank empty state | Ideas saved to Idea Bank |
| **Develop an existing idea** | Login menu (when ideas exist), Idea Bank | Post published or scheduled |
| **Schedule an existing draft** | Login menu (when drafts exist), Posts page | Post scheduled |
| **Set up my profile / voice** | First-login flow, settings prompt | Voice profile complete |
| **Connect LinkedIn** | First-login flow, settings prompt | LinkedIn OAuth complete |

Each workflow ends by asking "What would you like to do next?" with options filtered by user state (e.g., don't suggest "Develop an existing idea" when the Idea Bank is empty).

##### 5. Workflow Catalog (Post-V1, Documented but Deferred)
- **Edit / improve a previous post** (use Hook Analyzer, ask AI for variations)
- **Review my analytics and pick a winning topic to repeat**
- **Manage my settings** (AI provider, theme, notifications)
- **Reschedule or unschedule a post**
- **Manually mark a post as posted**
- **Past-due post recovery** (pairs with BP-034)

##### 6. Login → Welcome Prompt
- When Guided Mode is on, every login lands at a welcome prompt: "Welcome back, [name]. What would you like to do today?"
- Options curated by user state:
  - Always shown: "Create a new AI-assisted post"
  - Conditional: "Develop an existing idea" (only if Idea Bank has unprocessed ideas)
  - Conditional: "Schedule an existing draft" (only if there are unpublished drafts)
  - Conditional: "Connect LinkedIn" (only if not yet connected)
  - Conditional: "Set up your voice profile" (only if voice profile incomplete)
  - Always shown: "Just let me explore" (one-time bypass for the session)

##### 7. Context-Aware "What Next?"
After each completed workflow, the assistant asks "What would you like to do next?" with the same conditional logic as the welcome prompt — but informed by the workflow that was just completed. Examples:
- After publishing a post → suggest "Schedule another post," "Generate more ideas," "Mark a different post as posted"
- After saving brainstormed ideas → suggest "Develop one of these ideas now," "Generate more ideas," "Take a break"
- After scheduling → suggest "Create another post," "View your calendar," "Done for now"

##### 8. Off-Script Handling
- If the user clicks something outside the suggested flow, the assistant:
  - Acknowledges: "Looks like you opened the [thing]. Want help with that, or should I keep helping you with [original goal]?"
  - Offers to switch the active workflow OR pause the current one
  - Never blocks or disables the rest of the UI — Guided Mode is additive, not restrictive

##### 9. Persistence
- Guided Mode preference: per-user, stored in `creator_profiles.guided_mode_enabled`
- Active workflow state: in-memory only (no need to resume across sessions for V1)
- "Don't show me this workflow's intro again" preference: per-workflow flag stored in `creator_profiles.guided_workflows_dismissed` (jsonb)

##### 10. Tier Availability
**Available to all tiers** including Free. This is onboarding quality, not a paid feature. Do **not** gate it.

#### Technical Notes (Architecture Suggestions)

- **Reuse the Tutorial SDK** (`packages/tutorial-sdk/`) for action detection, spotlight overlay, and timeout handling. Guided Mode is essentially "long-running, branching, multi-workflow tutorials" — the engine primitives are the same.
- **New package or module** for workflow definitions (`src/lib/guided-mode/workflows/`). Each workflow is a typed array of steps.
- **AI Assistant integration:** the existing AI Assistant panel may be the right host for the conversational layer. Consider extending it rather than building a new panel.
- **Avoid hard-coupling** workflow steps to specific component selectors when avoidable. Use stable `data-tour-id` (already in use for tutorials) attributes.
- **Action verification:** when the user clicks a suggested action, the workflow engine verifies the resulting state (e.g., "the modal opened," "the post status changed to scheduled") before advancing. Don't just assume the click did what we expected.

#### Out of Scope for V1
- Cross-session workflow resume ("you started creating a post yesterday — want to continue?") — capture as future BP if requested
- Voice/audio guidance — text only for V1
- Multi-language support — English only
- Analytics on workflow completion rates — capture as future BP
- A/B testing different prompt copy — future
- LLM-generated dynamic prompts — V1 uses static, hand-authored prompts for control and predictability

#### Acceptance Criteria

- [ ] Guided Mode toggle in Settings, default ON for new accounts, OFF for existing accounts
- [ ] Persistent assistant surface visible in the UI when Guided Mode is on
- [ ] Login welcome prompt with state-aware options
- [ ] All 6 V1 workflows ship and are tested end-to-end
- [ ] After each workflow ends, "what next?" prompt appears with context-aware options
- [ ] Off-script clicks are handled gracefully (acknowledge + offer to switch or pause)
- [ ] User can disable Guided Mode mid-flow with one click
- [ ] Re-enabling Guided Mode is discoverable in Settings and Help
- [ ] No regressions in standard (non-guided) UI for existing users
- [ ] Available to all tiers (Free, Creator, Pro); not gated

#### Notes

- **Strategic alignment:** This is a **viability multiplier** for the Free→Pro segment. Less technical users are exactly the alpha-testing audience the new direction targets. Without Guided Mode, the product's surface area is a barrier to first-time success.
- **Relationship to BP-035 (Tutorial cleanup):** complementary, not competing. Tutorials are one-shot education; Guided Mode is persistent assistance. Land BP-035 first (so the Tutorial SDK foundation is solid), then build Guided Mode on top of the same engine.
- **Relationship to BP-084 (Tutorial card visual redesign):** the new card design from BP-084 may be reused as the visual language for Guided Mode prompts. Design consistency.
- **Effort estimate:** **L–XL** (1.5–2 weeks of focused work for V1 with 6 workflows). Possible to phase: V1a = Create Post workflow only (3-5 days), V1b = remaining 5 workflows (1-1.5 weeks).
- **Suggested sprint placement:** After Sprint 2 (P1 viability bug fixes land first). Could be its own dedicated Sprint 2.5 or split across Sprints 3 and 4 of the [reprioritization plan](reviews/2026-04-16-backlog-reprioritization.md). Recommend the phased approach so the canonical Create Post workflow ships fast and gets user feedback before investing in the other 5.

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
- **BP-086:** Show Directly Published Posts on Calendar (2026-04-15)
- **BP-087:** Published Post View — Separate Route (2026-04-16)
- **BP-023:** Brand/Team Onboarding Path (2026-04-16)
- **BP-046:** Post Assignment & Ownership (2026-04-16)
- **BP-047:** In-App Comments on Posts (2026-04-16)
- **BP-048:** Activity Feed (2026-04-16)
- **BP-049:** Notifications Center (2026-04-16)
- **BP-050:** Configurable Approval Workflow (2026-04-16)
- **BP-051:** Review Queue (2026-04-16)
- **BP-100:** Scheduled Posts Drop Images — Edge Function out of sync (2026-04-16)
- **BP-101:** LinkedIn Text Truncation on Unescaped Reserved Characters (2026-04-22)
- **BP-034:** Past-Due Checker — Direct Publish Button (2026-04-22)
- **BP-037:** Clarify Version Management & Convert to Post UX (2026-04-22)
- **BP-092:** LinkedIn Analytics — Gate UI on Scope Grant (2026-04-22)
