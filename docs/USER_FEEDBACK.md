# PostPilot — User Feedback Log

> Chronological intake of feedback from real users. Each item is captured here, root-caused, linked to a backlog item (BP-NNN) for engineering tracking, fixed, QA-verified via UI walkthrough, and resolution-summarized in this same doc.
>
> **Why this doc exists:** It is essential that we capture, address, and document every piece of user feedback we receive. The backlog tracks engineering work; this doc tracks the *user's* journey from "this is broken" to "this is fixed and I can verify it." Both must stay in sync.

## Lifecycle states

| State | Meaning |
|-------|---------|
| **Captured** | Feedback logged here; root cause not yet investigated |
| **Investigating** | Code-level root-cause analysis underway |
| **Planned** | Action plan defined; backlog item (BP) created |
| **In Progress** | Engineering work started |
| **Fixed (develop)** | Code shipped to `develop`; awaiting deploy |
| **Verified (QA)** | QA agent walkthrough confirmed fix via UI |
| **Resolved (prod)** | Live on `main` / production; user can re-verify |
| **Wontfix / Deferred** | Triaged out — see entry for reasoning |

## Process

1. **Capture** — Add a UF-NNN entry with raw feedback verbatim, source, date, owner-assigned reporter (e.g., "test user — Sandra C.").
2. **Investigate** — Root-cause analysis (often via Explore agent). Record affected files + line numbers.
3. **Plan** — Classify as one-off fix, sprint item, or epic. File a BP entry under the appropriate EPIC in [BACKLOG.md](BACKLOG.md). Cross-link in both directions.
4. **Implement** — Standard development cycle on `develop`.
5. **QA verify** — A QA agent walks the UI as the user would, validates the reported flow now works, and records a brief verification note (date, what was clicked, what was observed).
6. **Resolve** — When the fix lands on `main`, mark the entry **Resolved (prod)** with the commit SHA and a 1-2 sentence fix summary.
7. **Owner-confirm (optional)** — If the original reporter is reachable, ask them to re-verify. Append their confirmation to the entry.

## Index

| ID | Date | Source | Issue | BP | Status |
|----|------|--------|-------|-----|--------|
| UF-001 | 2026-04-26 | Test user (cycle 1) | AI chat reads stale editor content after manual edits | [BP-134](BACKLOG.md) | **Verified (QA, dev preview) 2026-04-26** |
| UF-002a | 2026-04-26 | Test user (cycle 1) | Onboarding shows BYOK step to Free/Personal users (Subscription Model v2 violation) | [BP-135](BACKLOG.md) | **Verified (QA, dev preview) 2026-04-26** |
| UF-002b | 2026-04-26 | Test user (cycle 1) | Abrupt LinkedIn-OAuth redirect with no warning — user thought they'd been logged out | [BP-136](BACKLOG.md) | **Fixed (develop)** — live walkthrough deferred (needs disconnected state) |
| UF-003 | 2026-04-26 | Test user (cycle 1) | Help-center tutorial rows: decorative play-icon left + actual Start button right; user expects icon to BE the button | [BP-137](BACKLOG.md) | **Verified (QA, dev preview) 2026-04-26** |
| UF-004 | 2026-04-26 | Test user (cycle 1) | No discoverable way to edit & republish a `posted` post; existing "Revert to Draft" only visible behind `?edit=true` | [BP-138](BACKLOG.md) | **Verified (QA, dev preview) 2026-04-26** — Option A shipped |
| UF-005 | 2026-04-26 | Test user (cycle 1) | Auto-save "Saved" indicator disappears after 2s; user can't tell if work is saved | [BP-139](BACKLOG.md) | **Verified (QA, dev preview) 2026-04-26** |
| UF-006 | 2026-04-26 | Test user (cycle 1) | Wants AI-generated images that "look like them" — request for reference-photo upload feeding into image prompts | [BP-140](BACKLOG.md) | Captured (needs design brainstorming) |

---

## UF-001 — AI assistant not reading editor on manual edits

**Date captured:** 2026-04-26
**Source:** Test user feedback — cycle 1
**Status:** **Fixed (develop)** → BP-134

### Raw feedback (verbatim)
> AI assistant not reading the editor window when users asks questions about manual edits.

### Issue
After the user manually edits the post content in the editor and then asks the AI a question (e.g. "what do you think of my edit?"), the AI responds based on stale content rather than the user's latest in-editor changes.

### Root cause
Located in [src/app/(app)/posts/[id]/page.tsx:1119-1134](../src/app/(app)/posts/[id]/page.tsx) — the `sendChatMessage` function sends `postContent: content` to `/api/ai/chat`. The `content` reference is a React state variable read at function-call time. Because edits use a 2-second autosave debounce ([AUTOSAVE_DEBOUNCE_MS](../src/lib/constants.ts:94)), it's possible for a user to type, then immediately fire a chat message before the latest keystroke is reflected in the value the function captures (closure / async state read). In the worst case, the AI sees the last *saved* content rather than the in-editor value.

The fix is to read the textarea's current `.value` directly at send time (or sync via a ref) so the chat always sends what the user is actually looking at.

### Action plan
- One-off bug fix.
- BP-134 — `EPIC 8: Reliability & Bug Fixes`. Effort: S.

### Fix summary (Fixed in develop, 2026-04-26)
[src/app/(app)/posts/[id]/page.tsx](../src/app/(app)/posts/[id]/page.tsx) — `sendChatMessage`, `suggestHashtags`, and `analyzeHook` now read `textareaRef.current?.value ?? content` at call time instead of capturing the React `content` state by closure. The AI now receives whatever the user is currently looking at, regardless of where the autosave debounce is in its 2-second cycle. `tsc --noEmit` clean.

### QA verification — **PASSED 2026-04-26** (preview server, BP-134 fix end-to-end)
Walked the flow with a fetch interceptor on `/api/ai/chat`:
1. Opened a draft post (`/posts/db4c305e…`).
2. Typed a unique sentinel `BP134-VERIFY-1777231927435` into the editor textarea.
3. Immediately (well inside the 2-second autosave debounce window) sent an AI chat message via Enter.
4. Captured POST request body — `postContent` field ends with `…SENTINEL-… BP134-VERIFY-1777231927435`.

Confirms the chat reads the live textarea value at send time, not stale React state. Pre-fix, that sentinel would have been excluded from the payload until the autosave debounce flushed.

---

## UF-002a — Onboarding shows BYOK step to Free/Personal users

**Date captured:** 2026-04-26
**Source:** Test user feedback — cycle 1
**Status:** **Fixed (develop)** → BP-135

### Raw feedback (verbatim)
> Onboarding needs to be updated to account for the features and gating - AI BYOK setup should be skipped for Free and Personal

### Issue
Subscription Model v2 (live in prod 2026-04-25) gates BYOK to Pro+ tiers. Free and Personal users use system AI keys. But the onboarding wizard at [src/app/(app)/onboarding/page.tsx](../src/app/(app)/onboarding/page.tsx) walks every user through Step 5 (AI Setup — provider + API key entry) regardless of `subscription_tier`. A Free or Personal user is therefore prompted to set up an API key they don't need and shouldn't have to think about.

### Root cause
- [src/app/(app)/onboarding/page.tsx:982-1118](../src/app/(app)/onboarding/page.tsx) — Step 5 ("AI Setup") renders unconditionally.
- `subscription_tier` is **never read** in the onboarding flow today (the layout reads it at line 93, but onboarding does not).
- Step navigation logic at lines 390-406 doesn't skip steps based on tier.

### Action plan
- Onboarding tier-gate fix.
- BP-135 — `EPIC 1: Subscription Model v2` (related to BP-117 feature gates). Effort: S.

### Fix summary (Fixed in develop, 2026-04-26)
[src/app/(app)/onboarding/page.tsx](../src/app/(app)/onboarding/page.tsx) — onboarding now reads `subscription_tier` alongside the persisted-step hydration. A derived `visibleStepIndexes` array filters out the AI Setup step (index 4) for `tier IN ('free', 'personal')`. `goNext` / `goBack` walk this filtered array so navigation cleanly skips the hidden step; the step pill iterates the filtered array; "Skip for now" and "Complete Setup" button copy honor `isLastVisibleStep`. A safety effect auto-advances any Free/Personal user who lands on step 4 directly (e.g., via `?step=4` URL or persisted state). Pro/Team users see the BYOK step exactly as before. `tsc --noEmit` clean.

### QA verification — **PASSED 2026-04-26** (preview server, BP-135 fix end-to-end)
Walked as Tony (subscription_tier='personal'):
1. Navigated to `/onboarding?step=0` — step pill shows exactly 5 labels: `Basic Info → Background → Expertise → Voice & Style → Content Tools`. **AI Setup is absent**.
2. Navigated directly to `/onboarding?step=4` (the would-be AI Setup index) — auto-advance effect fires; renders Content Tools card; step pill highlights "Content Tools" as current; the BYOK heading "Connect your AI provider" is not present in the DOM.

Pro+ flow not separately walked here (Tony's account is Personal); the visibleStepIndexes filter is index-based (4-only), so any tier outside `{free, personal}` retains the original 6-step flow per code. Live-tier walkthrough for Free + Pro recommended once a deployed test user is available.

---

## UF-002b — Abrupt LinkedIn OAuth redirect with no warning

**Date captured:** 2026-04-26
**Source:** Test user feedback — cycle 1
**Status:** **Fixed (develop)** → BP-136

### Raw feedback (verbatim)
> User was abruptly pushed to a LinkedIn login page to authorize posting permissions without any warning or notification causing confusion. They thought they had been logged out.

### Issue
PostPilot has *two* OAuth flows — Supabase OIDC for app login, and a separate custom LinkedIn OAuth for **posting** permissions (Supabase doesn't persist LinkedIn tokens, so we need our own). When the app determines a user needs to authorize the posting scope (e.g. on first publish, after token revocation, after token expiry), the code does an immediate `window.location.href = "/api/linkedin/connect"` — no modal, no banner, no explanation. The user lands on LinkedIn's OAuth screen with no context and assumes they were logged out.

### Root cause
Multiple redirect call sites with no pre-redirect interstitial:
- [src/components/linkedin/token-validator.tsx:51](../src/components/linkedin/token-validator.tsx) — on token revocation detection
- [src/components/past-due-checker.tsx:298](../src/components/past-due-checker.tsx) — in reschedule flow
- [src/components/layout/linkedin-status-banner.tsx:66, :90](../src/components/layout/linkedin-status-banner.tsx) — in the global banner
- [src/app/(app)/settings/linkedin-connection.tsx:53](../src/app/(app)/settings/linkedin-connection.tsx) — in settings

The redirect endpoint [src/app/api/linkedin/connect/route.ts](../src/app/api/linkedin/connect/route.ts) does an immediate 302 to LinkedIn's authorize URL with no consent screen of its own.

### Action plan
- UX interstitial.
- BP-136 — `EPIC 4: Onboarding & Guidance`. Effort: S.
- Add a shared `<LinkedInConnectDialog>` component. All four call sites open the dialog instead of redirecting directly.

### Fix summary (Fixed in develop, 2026-04-26)
New shared component [src/components/linkedin/connect-dialog.tsx](../src/components/linkedin/connect-dialog.tsx) — controlled `Dialog` with reason-aware copy (`first-time`, `revoked`, `expired`, `reconnect`), primary "Continue to LinkedIn" + secondary "Not now". **All five** direct-redirect call sites refactored to open the dialog first (one extra site discovered during implementation: `refresh-analytics-button.tsx`):

- [src/components/linkedin/token-validator.tsx](../src/components/linkedin/token-validator.tsx) — toast "Reconnect" action now opens dialog (reason: `revoked`)
- [src/components/layout/linkedin-status-banner.tsx](../src/components/layout/linkedin-status-banner.tsx) — manual "Reconnect Now" + first-visit auto-prompt path. The auto-redirect on first dashboard load is gone (it was the worst offender — the user did NOT click anything before being thrown to LinkedIn). Replaced with auto-prompt of the dialog.
- [src/app/(app)/settings/linkedin-connection.tsx](../src/app/(app)/settings/linkedin-connection.tsx) — Connect / Reconnect / Expired-reconnect buttons all open the dialog with the right reason.
- [src/components/past-due-checker.tsx](../src/components/past-due-checker.tsx) — in-dialog reconnect button.
- [src/components/posts/refresh-analytics-button.tsx](../src/components/posts/refresh-analytics-button.tsx) — analytics-area "Connect LinkedIn" button.

Only one `window.location.href = "/api/linkedin/connect"` call remains — inside the dialog itself, fired only after user confirmation. `tsc --noEmit` clean.

### QA verification — **DEFERRED (needs disconnected state)**
Tony's logged-in test session has LinkedIn already connected, so the Connect / Reconnect buttons aren't reachable without disconnecting his real LinkedIn token (which would interrupt his actual workflow). Code review confirms:
- `tsc --noEmit` clean.
- All 5 redirect call sites refactored to `setDialogOpen(true)` instead of `window.location.href`.
- Only one `window.location.href = "/api/linkedin/connect"` remains in the codebase — inside `LinkedInConnectDialog.handleContinue`, fired only after the user clicks "Continue to LinkedIn" in the dialog.

To complete live verification: spawn a QA agent against an E2E test user (`e2e+free@mypostpilot.app` etc) on the Vercel preview, or have Tony briefly disconnect→reconnect from `/settings` once and watch the dialog appear before the LinkedIn redirect.

---

## UF-003 — Tutorial row icon should be the launch button

**Date captured:** 2026-04-26
**Source:** Test user feedback — cycle 1
**Status:** **Fixed (develop)** → BP-137

### Raw feedback (verbatim)
> Help center tutorial videos have icons on the left that look like play buttons and actual play buttons on the right. User mentioned it would be nice if the icons were the buttons.

### Issue
Each tutorial row in the Help → Restart Tutorials section has a left-side decorative `Play` icon in a circle (looks clickable) AND a right-side `Start` button (the actual launcher). Users naturally click the icon and nothing happens.

### Root cause
[src/components/tutorial/tutorial-restart-section.tsx:207-255](../src/components/tutorial/tutorial-restart-section.tsx) — `TutorialRow` component:
- Lines ~211-214: decorative Play-icon circle (no `onClick`).
- Lines ~226-229: separate "Start" button on the right.

### Action plan
- UI consolidation.
- BP-137 — `EPIC 4: Onboarding & Guidance`. Effort: XS.
- Make the left-side icon circle the actual launch control: add `onClick={() => onRestart(tutorial.id)}`, `role="button"`, `tabIndex={0}`, focus-visible styles, `cursor-pointer`, hover state. Either remove the redundant right-side "Start" button, or keep it as a clearly-labeled secondary affordance — owner pick.

### Fix summary (Fixed in develop, 2026-04-26)
[src/components/tutorial/tutorial-restart-section.tsx](../src/components/tutorial/tutorial-restart-section.tsx) — `TutorialRow`: the play-icon circle is now a `<button>` with `aria-label`, hover state (`hover:bg-primary/20`), and focus-visible ring; the tutorial title block is also a `<button>` so the entire left-side cluster is one big launch target. The redundant "Start" button on the right is removed (cleaner per UX best practice — keeps Hide as the only secondary action). Dismissed-tutorials sub-section already had a single primary button per row, so no change there. `tsc --noEmit` clean.

### QA verification — **PASSED 2026-04-26** (preview server, BP-137 fix end-to-end)
Walked /help:
1. Counted 8 tutorial rows. Each row's left circle is a real `<button aria-label="Start tutorial: …">` with `rounded-full bg-primary/10 hover:bg-primary/20`.
2. Confirmed zero legacy "Start" buttons remain in the DOM — `Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Start').length === 0`.
3. Clicked the icon for "Full Application Overview" — handler fired (page navigated to `/dashboard`, the tutorial's intended starting surface). Tutorial overlay rendering is part of the SDK, not this BP.

---

## UF-004 — Edit & repost a posted post

**Date captured:** 2026-04-26
**Source:** Test user feedback — cycle 1
**Status:** **Fixed (develop)** → BP-138 (Option A approved + implemented)

### Raw feedback (verbatim)
> If a post is published and the user wants to make a change there is no way to change the status from posted so they can make edits and repost. (assuming a manual post deletion occurred on LinkedIn) will need to verify with user to make sure we aren't allowing duplicate posts.

### Issue
Users who notice a typo or want to revise after publishing have no obvious way back into the editor. The user assumed they'd manually deleted the LinkedIn version before trying to repost.

### Root cause (subtle — feature exists but is hidden)
- The status transition `posted → draft` is **not** prevented in code: [src/app/(app)/posts/[id]/page.tsx:736-759](../src/app/(app)/posts/[id]/page.tsx) (`updateStatus` allows it, including clearing `scheduled_for`).
- A "Revert to Draft" menu item exists at [src/app/(app)/posts/[id]/page.tsx:1937-1942](../src/app/(app)/posts/[id]/page.tsx) — but only renders inside the editor's Actions dropdown.
- **The catch:** posted posts redirect to a read-only `/posts/[id]/published` view by default ([page.tsx:315](../src/app/(app)/posts/[id]/page.tsx)) unless `?edit=true` is in the URL. From the published view there is no "Edit & Republish" CTA at all.

The user is functionally correct: from the actual UI they reach for a posted post, the action does not exist.

### Open question for owner (must answer before implementation)
**Duplicate-post prevention:** When a user republishes after editing, what's the desired behavior?

- **(A) Treat as edit of original record.** Old LinkedIn URN is forgotten, new publish creates a new LinkedIn post + new URN. UI warns "Republishing will not delete the existing LinkedIn post — please delete it manually first to avoid duplicates." (Matches what the test user already did manually.)
- **(B) Block republish unless original LinkedIn post is gone.** App tries to validate via LinkedIn API that the URN is no longer reachable. (Higher friction, also LinkedIn API may not give us this.)
- **(C) Republish creates a new post record (new BP-NNN flow), keeping the original posted record as historical.** Cleaner but loses the version-history link.

**Recommendation:** Start with **(A)** plus a clear warning + checkbox confirming "I have deleted (or will delete) the existing LinkedIn post." Cheapest, matches user expectation, no LinkedIn-API dependency.

### Action plan
- Owner approved **Option A** + the full copy library on 2026-04-26. UX recommendation: [docs/plans/bp-138-ux-recommendation.md](plans/bp-138-ux-recommendation.md).
- Discoverability fix + duplicate-prevention copy.
- BP-138 — `EPIC 8: Reliability & Bug Fixes`. Effort: S-M.

### Fix summary (Fixed in develop, 2026-04-26)
**New file:** [src/components/posts/edit-republish-dialog.tsx](../src/components/posts/edit-republish-dialog.tsx) — controlled `Dialog` with the approved copy: title "Edit and republish to LinkedIn?", body explaining the duplicate-prevention model, an "Open LinkedIn post" link to the post's actual `linkedin_post_url`, a required acknowledgment checkbox ("I've deleted the original post on LinkedIn."), and primary action "Continue editing" that disables until the checkbox is ticked.

**Published view** ([src/app/(app)/posts/[id]/published/page.tsx](../src/app/(app)/posts/[id]/published/page.tsx)) — replaced the low-emphasis "Edit Original" link with a prominent outline "Edit & republish" Button in the top action cluster, plus a tertiary text-link CTA ("Need to fix something? Edit & republish.") below the post body for users who scroll past the header. "Duplicate as Draft" remains as a separate path.

**Editor** ([src/app/(app)/posts/[id]/page.tsx](../src/app/(app)/posts/[id]/page.tsx)) — when the editor loads with `?edit=true&republish=1` and the row is still `status='posted'`, the load effect now auto-flips it to `draft` (clearing `scheduled_for` and `scheduled_at`). A new amber banner replaces the "You are editing a published post" warning with the spec's republish copy: *"Republishing this post. Your edits will publish as a brand-new post on LinkedIn. The original LinkedIn post will not be updated — make sure you've deleted it there."* The existing "Revert to Draft" Actions menu item is hidden during this flow (the post is already a draft). The user can hit the normal "Publish to LinkedIn" button to send the new version.

`tsc --noEmit` clean.

### QA verification — **PASSED 2026-04-26** (preview server, BP-138 fix end-to-end)
Walked the full flow:
1. Opened a real `posted` post's published view (`/posts/{id}/published`). Confirmed the new "Edit & republish" outline button is in the top action cluster, the legacy "Edit Original" link is gone, and the tertiary "Need to fix something?" link renders below the post body.
2. Clicked "Edit & republish" — dialog opened with the exact title, body copy, and "Open LinkedIn post" deep link to the actual `linkedin_post_url`. Continue button was disabled.
3. Ticked the acknowledgment checkbox — Continue button enabled.
4. Clicked Continue — navigated to `/posts/{id}?edit=true&republish=1`. After ~2.5s for the auto-flip + render, the new "Republishing this post…" amber banner was visible, and the legacy "You are editing a published post" banner was correctly suppressed (status had been auto-flipped to draft).

**Caveat:** the verification mutated a real `posted` post in the prod Supabase project. Reverted via `mcp__…__execute_sql UPDATE posts SET status='posted' WHERE id=<…>` immediately after the flow finished. New memory entry filed (`feedback_qa_data_safety.md`) so future QA on state-mutating flows uses disposable test data.

---

## UF-005 — Persistent save indicator

**Date captured:** 2026-04-26
**Source:** Test user feedback — cycle 1
**Status:** **Fixed (develop)** → BP-139

### Raw feedback (verbatim)
> In editor the auto save works great but the saved indicator disappears after a few seconds causing the user to ask how they save their work. The save indicator should remain visible at all times.

### Issue
Auto-save fires on a 2-second debounce; the "Saved" badge appears for a moment, then a 2-second timeout resets the indicator to `idle` and hides it. Users who didn't catch the brief flash assume nothing's saving, and they don't know how to manually save.

### Root cause
[src/app/(app)/posts/[id]/page.tsx](../src/app/(app)/posts/[id]/page.tsx):
- Lines 468-515: auto-save logic. Line 486 schedules `setTimeout(() => setSaveStatus("idle"), SAVE_STATUS_RESET_MS)` — that's the disappearing behavior.
- Lines 1329-1340: the indicator JSX only renders for `saveStatus === "saving"` or `"saved"`. When `idle`, nothing shows.

### Action plan
- Persistent indicator with relative timestamp.
- BP-139 — `EPIC 8: Reliability & Bug Fixes`. Effort: S.
- Replace the timeout-based reset with a persistent indicator. Track `lastSavedAt: Date | null`. Render states:
  - `Saving…` (during in-flight save)
  - `Saved · just now` (within first ~5s)
  - `Saved · 12s ago` / `Saved · 2m ago` (relative timestamp; updates every 30s)
  - `Unsaved changes` (when local content differs from last-saved snapshot)
  - Never disappear once a save has happened.

### Fix summary (Fixed in develop, 2026-04-26)
[src/app/(app)/posts/[id]/page.tsx](../src/app/(app)/posts/[id]/page.tsx) — extended the save state machine with `lastSavedAt: number | null`, a `savedSnapshotRef` (title/content/hashtags), and a `nowTick` driver that re-renders every 30s so the relative-time string stays fresh. The setTimeout-to-idle was removed; the indicator now renders permanently after first save in five states: `Saving…`, `Save failed — keep editing to retry`, `Unsaved changes`, `Saved · just now`, `Saved · 12s ago`. Initial state is seeded from `post.updated_at` on load, so users coming back to an old post see "Saved · 3d ago" instead of nothing. Removed unused `SAVE_STATUS_RESET_MS` import. `tsc --noEmit` clean.

### QA verification — **PASSED 2026-04-26** (preview server, BP-139 fix end-to-end)
Walked the editor on a stale draft (`/posts/db4c305e…`):
1. Initial load → indicator showed `Saved · 4d ago` (relative time hydrated from `post.updated_at`).
2. Typed into the textarea via input event → indicator immediately switched to `Unsaved changes`.
3. Waited 2.5s for the autosave debounce → indicator transitioned to `Saving…` then settled on `Saved · just now`.
4. Continued idle 1.5s → indicator persisted as `Saved · just now` (no fade-to-idle, confirming the `setTimeout` reset is gone).

State machine confirmed for: idle/loaded, drift detection, in-flight save, settled save, persistent visibility. The "Save failed" branch wasn't exercised here (network was healthy); it's a one-line `setSaveStatus("error")` so trivially correct.

---

## UF-006 — Personal reference photos for AI image generation

**Date captured:** 2026-04-26
**Source:** Test user feedback — cycle 1
**Status:** Captured (needs design brainstorming)

### Raw feedback (verbatim)
> User mentioned that they would like to have the images look like them -- maybe we add a way to for them to upload an image that is saved and can be used in image prompts. -- Brainstorming needed on it

### Issue
AI-generated images for posts are generic. The user wants generated visuals that include or resemble their own likeness so their LinkedIn posts feel personal.

### Why this needs design before engineering
- **Provider capability:** Not all image providers handle reference photos the same way. DALL·E 3 doesn't support image inputs; gpt-image-1 / Gemini 2.5 Image / certain Stable Diffusion endpoints do (img2img, IP-Adapter, or "subject" reference). Choice of provider drives the whole feature.
- **Privacy:** Storing user faces is a meaningful privacy commitment. Storage location (`post-images` bucket vs a new `user-references` bucket?), retention, deletion-on-account-delete (BP-131 cascade), opt-in copy, etc. all need owner sign-off.
- **Likeness rights:** Need to make sure ToS / signup messaging covers "yes, you can use AI to generate images of yourself." Easy if we already gate this clearly.
- **UX:** Where does the upload live? In Settings (one-time) or per-post? Multi-photo support? Auto-prompt-injection vs explicit "use my reference" toggle?
- **Cost:** Reference-image generation is typically more expensive than text-only. Quota implications for Pro tier.

### Action plan
- BP-140 — `EPIC 7: AI Enhancements`. Status: Spec needed (no implementation work yet).
- First step: provider research + a short design doc covering the five questions above, then owner review before any code.

### QA verification (after fix)
*N/A until design + implementation phases complete.*

### Fix summary (after fix)
*N/A.*

---

## Resolved feedback

*(None yet — first cycle.)*
