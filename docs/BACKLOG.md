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
