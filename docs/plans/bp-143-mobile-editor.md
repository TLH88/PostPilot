# BP-143 — Mobile Editor Layout (Post Editor + AI Assistant on Small Screens)

> Author: Design agent · v1 2026-05-04
> Backlog: [BACKLOG.md BP-143](../BACKLOG.md)
> Sibling of: [BP-099 — Launch Pad](bp-099-guided-ui-mode.md) (Phase 2 ships the bottom tab bar; this BP fills out the editor itself)
> Status: **Spec drafted 2026-05-04 — awaiting owner sign-off before implementation.** No code changes in this round.
>
> **Scope:** the post editor at `/posts/[id]` and the AI Assistant that lives next to it, at viewports below `md` (Tailwind 768px). Everything else — Launch Pad shell, sidebar, settings, calendar — is out of scope (covered by BP-099 P2 or unaffected at this breakpoint).

---

## 1. Problem Statement

The post editor at `src/app/(app)/posts/[id]/page.tsx` is the most complex single screen in the app. On desktop it works because there is room for two columns: a left "editor" column (title, content textarea, image block, LinkedIn preview, character counter, version dropdown, hashtag tools, action buttons) and a right "panel" column that toggles between AI Assistant, Comments, and Activity. The right panel takes ~40% of the viewport when open.

Below the `lg` breakpoint (1024px) the existing code already collapses the right panel to a toggle button (`PanelRightClose` / `PanelRightOpen`), but the *layout it reveals when open* is still the desktop layout — a 60/40 flex row that, on a 390px-wide phone, leaves the editor at ~234px wide with the assistant fighting for the remaining ~156px. Neither surface is usable. Below 768px the situation is worse: the formatting toolbar wraps onto three rows, the version-history dropdown and pillar-selector dropdown collide, the LinkedIn preview is wider than the viewport's content area, and the publish/schedule actions are buried at the bottom of an already-tall page.

Concrete surfaces that break at <768px today:

| Surface | Source | What breaks |
|---|---|---|
| Two-column flex layout | `flex flex-1 gap-4` row at `posts/[id]/page.tsx:1867` | Both columns squeeze; AI panel becomes a vertical sliver |
| Right-panel toggle | `lg:hidden` button at `:1675` | Tapping it stacks the assistant *below* the editor inside the same scrolling region — the user has to scroll past the entire post to see what the AI just said |
| Formatting / pillar / version row | The header div between the title row and the textarea | Buttons wrap to multiple rows; the version-history dropdown overlaps the pillar dropdown |
| LinkedIn preview | `<LinkedInPreview>` rendered inline | Designed for ~552px LinkedIn web width; doesn't match the 322px-ish iOS LinkedIn preview width users actually care about |
| Image generator + version picker | `<GenerateImageDialog>` + `<ImageVersionPicker>` | Open as desktop-sized modals that overflow the viewport on phones |
| Status / save / actions row | The header band above the editor | "Saved · 12s ago" + status badge + Preview + Publish + Schedule + `…` menu collapse onto one row that overflows horizontally |
| Chat textarea | The bottom of the right panel | When the iOS Safari virtual keyboard opens, the textarea is hidden behind the keyboard; the user is typing blind |
| Quick suggestion chips | `QUICK_SUGGESTIONS` row above the chat input | Five chips on one line wrap unpredictably and push the input off-screen |
| Comments / Activity tabs | Tab strip at the top of the right panel | Three tabs at small text fight the viewport width; tabs visually merge |

This BP is **not** "make the desktop UI render at smaller sizes." It is **a separate mobile layout** that gates the desktop layout behind `hidden md:flex` and renders a purpose-built mobile layout via `md:hidden`. Same data, same hooks, same API calls, same autosave path — different presentation.

---

## 2. Design Principles

1. **Single primary column.** At <768px the editor is a single full-width column. The AI Assistant is summoned, not always-visible. No two-column layouts at any time below `md`.
2. **AI Assistant is always reachable in ≤1 tap.** From any state of the editor, a single visible affordance opens the assistant. Closing it returns the user to the exact draft state they left.
3. **Tailwind responsive only — no JS user-agent sniffing.** Layout decisions are made by `md:hidden` / `hidden md:block` gates, not by `window.innerWidth` checks or UA strings. SSR-safe; no hydration mismatch.
4. **No feature cuts.** Every action available on desktop is reachable on mobile. Less-frequent actions move into a `…` overflow menu, but nothing is removed.
5. **Reuse, don't reimplement.** The chat message list, streaming logic, image dialog, schedule dialog, version picker, and LinkedIn preview component all stay. Mobile components are *containers* that re-arrange existing UI; they do not duplicate it.
6. **Match BP-099 Phase 2 navigation patterns.** Bottom-fixed UI sits *above* the BP-099 P2 mobile tab bar. `safe-area-inset-bottom` is honored everywhere. No surface should occlude the tab bar's tap targets unless explicitly modal.
7. **Virtual-keyboard aware.** When the user is typing in the chat textarea on iOS Safari, the textarea remains visible above the keyboard. This is a hard requirement — typing blind is not acceptable.

---

## 3. Core Decision: AI Assistant Placement

This is the load-bearing decision of the whole BP. Three options were considered. **Recommended: A — Bottom Sheet.**

### A. Bottom Sheet (recommended)

A draggable sheet that slides up from the bottom of the viewport on demand. The editor remains rendered behind it, dimmed by a scrim. The user opens it via a persistent "Chat" button (a sheet trigger; specifics in §5), drags it to one of two snap heights (peek ~30vh or full ~85vh), and dismisses by dragging down or tapping the scrim.

**Pros:**
- Strongest continuity. The user can read the AI's response, drag the sheet down to peek at the draft below, then drag it back up to keep typing — no navigation, no state loss.
- Familiar mobile pattern (iOS Maps, Apple Music, Notion mobile, Linear mobile). Users do not need to learn a new gesture.
- Doesn't sacrifice editor real estate when collapsed. The editor uses the full viewport when the sheet is closed.
- Plays well with virtual keyboards: when the textarea is focused, the sheet snaps to "full" and the keyboard insets are accounted for; the editor below is untouched.
- Composes cleanly with the BP-099 P2 mobile tab bar — the sheet sits above the tab bar but the tab bar remains tappable when the sheet is at peek height.

**Cons:**
- Implementation needs a real bottom-sheet primitive with snap points and drag gestures. The shadcn/ui `Sheet` component (already used by `MobileNav`) is a side drawer with one open/closed state and no snap points or peek mode; it is not sufficient as-is for the proposed UX. We either extend it or pull in `vaul` (a small headless drag-to-snap library, MIT-licensed, ~7kb) — see §12 for the open question.
- Scrim-while-typing can confuse users on first encounter. Mitigation: at "full" snap point the scrim fades to near-transparent so the editor remains visible behind the sheet (suggesting that closing the sheet returns the user to the draft).
- Drag gestures need testing on Android Chrome where touch targets and scroll-vs-drag arbitration differ from iOS Safari.

### B. Separate Page (`/posts/[id]/chat`)

A dedicated mobile-only route. The "Chat" button becomes a `Link` that navigates the user to a new page where the editor is replaced by the chat UI. The browser back button (or a header back arrow) returns to the editor.

**Pros:**
- Trivial to build. Just a new page that imports the same chat hooks; no new gesture library; no z-index battles.
- Predictable browser navigation semantics. Back button works without custom handling. Deep-linkable.
- No keyboard-occlusion problem — the chat is the entire viewport, so the textarea always has room.

**Cons:**
- Breaks "see your draft while chatting" continuity. The user cannot reference the draft they are asking the AI to revise without leaving the chat.
- Two-route state synchronization. Streaming a chat response on `/chat`, then navigating back, then having the response apply to the draft — works, but introduces a class of bugs (in-flight stream, navigation, drafts diverging) that the bottom sheet avoids by never unmounting the editor.
- Visual transition feels like leaving the app, not summoning a tool. Less premium feel.

### C. Collapsed Panel (always-visible bottom strip)

A fixed-height strip at the bottom of the viewport, expandable to ~50vh on tap. Always present; never fully dismissed.

**Pros:**
- Discoverability is excellent — users do not have to find a button; the assistant is right there.
- No gesture library required; just `height` transitions.

**Cons:**
- Permanently steals 60–80px of vertical real estate from the editor even when the user is not chatting. On a 667px-tall iPhone SE viewport, that is ~10% of the screen given over to a feature the user may not be using right now.
- Conflicts with the BP-099 P2 mobile tab bar (also bottom-fixed). Two stacked bottom bars + an OS home indicator + the iOS Safari URL bar consumes ~30% of the viewport.
- Half-expanded state (~50vh) leaves an awkward middle layout: editor is half-height but still scrollable; chat is half-height but with little content visible.

### Recommendation: A (Bottom Sheet)

**A** wins on continuity, mobile-native feel, and not stealing real estate when the assistant isn't in use. The cost is a real bottom-sheet primitive (vaul or similar) — a one-time investment that the rest of the app will benefit from (image generator dialog, schedule dialog, version picker can all migrate to the same primitive over time, see §11 / out of scope).

If the owner rejects A on dependency grounds, fall back to **B (Separate Page)**. C should not be picked.

---

## 4. Toolbar + Formatting Controls

The desktop "tools" row contains: pillar-selector dropdown, version-history dropdown (with show-auto toggle), hashtag tools, emoji picker, library insert, template picker, "save as template", "save snapshot", and various enhancement buttons. At <768px these wrap to three rows and become unreadable.

Three options were considered.

| Option | What it does | Why it's not picked |
|---|---|---|
| Multi-row wrap | Let the row wrap onto 2–3 lines | Wastes 60–90px of vertical space; hierarchy among tools becomes unclear; auto-wrap order changes by content width |
| Horizontal scroll | Single row, swipe-sideways | Hidden tools (those past the right edge) are invisible without horizontal scroll; novice users miss them; no visual hint that more exists beyond the edge |
| **Single "Format" button → popover (recommended)** | All tools collapse behind one button labeled "Format & insert" (or similar). Tapping opens a sheet/popover with a tidy vertical list. | Saves space; tools become a deliberate menu; matches mobile-native "more" patterns |

**Recommendation: Format & Insert popover.** A single button below the title, labeled "Format & insert", opens a half-height bottom sheet (same primitive as §3) listing the tools as a vertical menu:

- **Pillars** — opens existing pillar selector
- **Hashtags** — opens existing hashtag suggester / picker
- **Emoji** — opens existing emoji picker
- **Insert from library** — opens existing library picker
- **Use template** — opens existing template picker
- **Save snapshot** — fires existing version-save flow
- **Save as template** — opens existing dialog

The version-history *dropdown* itself collapses into the `…` overflow menu in the header (see §5) rather than this popover, because reverting/comparing versions is a destructive-feeling action and shouldn't sit next to "insert emoji."

---

## 5. Header / Status / Actions Row

Desktop today (single row above the textarea):
`[Back ←]  [Title input ──────────────]  [Status badge]  [Saved · 12s ago]  [Preview]  [Show Panel]  [Publish]  [Schedule]  [⋯]`

On mobile we cannot fit this. Recommended layout — two rows, fixed at the top of the editor (sticky on scroll):

**Row 1 (top):**
`[Back ←]  [Status badge]  [Saved indicator (icon-only)]  [⋯ overflow]`

- Back arrow returns to `/posts` (or wherever the user came from).
- Status badge is the existing `Badge` showing draft/scheduled/posted/etc.
- "Saved" indicator collapses to a small icon (cloud + check / spinner / error triangle); tapping it reveals the full "Saved · 12s ago" string in a tooltip-like popover. Plain text takes too much room.
- `…` menu contains: Preview, Version history, Hook analyzer, LinkedIn share (manual), Mark as posted, Move to archive, Delete. Anything not in the primary action button below.

**Row 2 (just below):**
`[Title input — full width]`

The title input gets its own row at full width because (a) it's the most-edited element and (b) it's a free-text field that benefits from the full content area.

**Below row 2 (below the title), a "primary action" zone:**
A single prominent button: **Publish** if the post is a draft, **Schedule** if scheduled-but-not-yet-posted, **View on LinkedIn** if posted, etc. The button changes state based on `status`. Schedule-vs-Publish-as-now is one of the open questions (§12) — recommendation: keep Publish as the prominent button and tuck Schedule into the `…` menu, on the rationale that scheduling is a less-common action than publishing.

The "Show Panel" / right-panel toggle is **dropped on mobile.** Its replacement is the "Chat" sheet trigger, which lives as a floating button at the bottom of the editor (see §3 + §8).

---

## 6. Image + Preview Blocks

Desktop renders the image generator section, the image upload, and the LinkedIn preview side-by-side or stacked depending on which version of the editor a given user has. On mobile, all three stack vertically, each at full content width.

- **Image upload / generator entry point.** A single card titled "Image" with two affordances: "Upload" and "Generate with AI". Tapping either opens the existing dialog (`GenerateImageDialog` or the file picker). The dialog itself, on mobile, is rendered as a full-screen sheet (taking over the viewport) rather than a centered modal — the existing `Dialog` component renders awkwardly at <400px viewports.
- **Image version picker.** When multiple image versions exist, the picker is a horizontal-scroll strip of thumbnails (with snap), not a popover. Thumbnails are 96px tall, fit roughly 3 across on a 390px viewport.
- **LinkedIn preview.** Shrinks to match LinkedIn's actual mobile post-card width (~322px on iPhone). The existing `LinkedInPreview` component already takes width via Tailwind; we wrap it in a container that constrains to `max-w-[322px] mx-auto` on mobile and the existing larger width on desktop. The preview is collapsed by default on mobile (only the post hook + image visible) with a "Show full preview" button below it; tapping expands to the full preview height. Rationale: most of the time on mobile the user is editing, not previewing — they don't need 600px of preview taking over the viewport on every keystroke.

---

## 7. AI Chat Composition Affordances (Virtual Keyboard)

The chat textarea sits at the bottom of the bottom sheet. When the user taps it, iOS Safari raises the virtual keyboard, which by default *covers* the bottom of the viewport. We need three things working in concert:

1. **Viewport meta with `interactive-widget=resizes-content`.** Set on the root layout's `<meta name="viewport">` so iOS resizes the layout viewport when the keyboard opens, instead of overlaying. This is a global change but only meaningful when something is using `100dvh` / `100vh` at the bottom edge of the layout — which the bottom sheet does. Confirm no regressions on other pages.
2. **Bottom sheet height in `dvh` units.** Use `100dvh` (dynamic viewport height) for the sheet's full snap point, not `100vh`. Combined with the viewport meta, the sheet shrinks when the keyboard opens, keeping the textarea visible.
3. **`safe-area-inset-bottom` padding.** The chat input row gets `pb-[env(safe-area-inset-bottom)]` so that on iOS, the input sits above the home indicator, not under it.

Quick suggestion chips ("Add a hook", "Make it shorter", etc.) live just above the input. On mobile they collapse to a horizontal-scroll strip rather than wrapping — five chips on one line at 14px font won't fit on a 390px viewport, so we let the user swipe. The first three are visible by default; the rest peek.

The chat message list scrolls inside the sheet. The send button sits to the right of the textarea (existing pattern). Voice-input is **out of scope** for V1.

---

## 8. Component Tree

All new components live under `src/components/posts/mobile/`. They wrap, do not replace, the existing inline JSX in `posts/[id]/page.tsx`. Visibility is gated by Tailwind responsive utilities — `md:hidden` on the mobile components, `hidden md:flex` on the desktop layout.

| Component | Path | Purpose | Key imports |
|---|---|---|---|
| `MobilePostEditor` | `src/components/posts/mobile/mobile-post-editor.tsx` | Top-level orchestrator. Receives the same state/handlers as the desktop layout. Renders header, title, content textarea, image block, preview, format-popover trigger, and the chat-sheet trigger. | All editor state from `posts/[id]/page.tsx` (lifted, see §9) |
| `MobileEditorHeader` | `src/components/posts/mobile/mobile-editor-header.tsx` | The two-row header described in §5. | Existing `Badge`, `DropdownMenu`, save-indicator helpers |
| `MobileEditorActions` | `src/components/posts/mobile/mobile-editor-actions.tsx` | The primary-action button (Publish / Schedule / View on LinkedIn) below the title. | Existing publish/schedule handlers |
| `MobileFormatSheet` | `src/components/posts/mobile/mobile-format-sheet.tsx` | The "Format & insert" popover (§4). Vertical menu list. | Existing pillar selector, hashtag tools, emoji picker, library/template pickers |
| `MobileAiSheet` | `src/components/posts/mobile/mobile-ai-sheet.tsx` | The bottom sheet wrapping the existing chat UI (§3 + §7). Two snap points (peek + full). | Existing chat state (messages, input, streaming, send fn) — passed via props |
| `MobileImageBlock` | `src/components/posts/mobile/mobile-image-block.tsx` | The Image card with Upload / Generate buttons + horizontal-scroll version strip (§6). | Existing `ImageUpload`, `GenerateImageDialog`, `ImageVersionPicker` |
| `MobileLinkedInPreviewCollapsible` | `src/components/posts/mobile/mobile-linkedin-preview.tsx` | Constrained-width wrapper around `LinkedInPreview` with collapse/expand (§6). | Existing `LinkedInPreview` |
| `MobileChatTrigger` | `src/components/posts/mobile/mobile-chat-trigger.tsx` | The floating button (or pill) the user taps to summon the AI sheet. | None new — just calls the sheet's `setOpen` |

**No new state.** All seven components receive their state via props from `posts/[id]/page.tsx`. The page component remains the single owner of post state, chat state, and async handlers. This mirrors how BP-099 P2 kept Launch Pad state in its parent and let the four mobile components be presentation-only.

**Existing components reused, not modified:**
- `LinkedInPreview` — mobile wrapper constrains its width
- `GenerateImageDialog`, `ImageUpload`, `ImageVersionPicker` — opened from the new image block
- `EmojiPicker`, `InsertFromLibrary`, `SaveToLibraryDialog`, `TemplatePicker`, `SaveAsTemplateDialog` — surfaced from the format sheet
- `ScheduleDialog`, `LinkedInShareDialog`, `MarkPostedDialog`, `PublishPreviewDialog` — opened from the actions/overflow menu
- `PostProgressBar` — renders below the header on both desktop and mobile (no mobile-specific variant)
- `UpgradePrompt`, `ApprovalControls`, `AssignPost`, `CommentsPanel`, `ActivityFeed` — workspace/team features. On mobile these become entries in the `…` overflow menu, opening as full-screen sheets when tapped.

**Not built in this BP:** a bottom-sheet primitive. We either (a) extend shadcn's `Sheet` to support snap points, or (b) add `vaul`. See §12 open question.

---

## 9. Page-Level Conditional Render

`src/app/(app)/posts/[id]/page.tsx` keeps its current structure: it owns all state, all hooks, all mutations. The change is at the *render* layer.

```
return (
  <div className="…existing top-level wrapper…">
    {/* Desktop layout — unchanged from today, gated to md+ */}
    <div className="hidden md:flex …existing classes…">
      {/* Existing header + two-column layout + right panel */}
    </div>

    {/* Mobile layout — new, gated to <md */}
    <div className="md:hidden flex flex-col …">
      <MobilePostEditor
        // post state
        post={post} title={title} content={content} hashtags={hashtags} status={status}
        // setters
        onTitleChange={handleTitleChange} onContentChange={handleContentChange} …
        // chat state
        chatMessages={chatMessages} chatInput={chatInput} chatStreaming={chatStreaming}
        onSendChatMessage={sendChatMessage} onChatInputChange={setChatInput}
        // dialogs (state owned by parent)
        onOpenScheduleDialog={() => setScheduleDialogOpen(true)}
        onOpenPublishPreview={() => setPublishPreviewOpen(true)}
        // … etc
      />
    </div>

    {/* Dialogs render once (shared between both layouts) */}
    <ScheduleDialog … />
    <PublishPreviewDialog … />
    {/* … etc */}
  </div>
);
```

**Why both branches in one component, not two pages:**
- One state owner. No prop drilling across routes; no risk of state divergence between a mobile and desktop instance of the editor.
- Dialogs render once. `ScheduleDialog`, `PublishPreviewDialog`, etc., live at the page level and are opened from either layout via the same `setOpen` handlers.
- Tailwind handles the switch. No `useEffect` reading window width, no hydration mismatch, no flash of wrong layout on first render.

The trade-off is that the page renders both component trees and lets CSS hide one. That cost is small — most of the trees collapse to nothing when display is none, and the mobile components don't mount their event handlers until they are actually visible (Tailwind's `hidden` does still mount the React tree, but inactive elements consume negligible runtime). If profiling later shows this is a problem, we can add a `useMediaQuery` hook to short-circuit one branch — but starting CSS-only is the right default per principle 3.

---

## 10. Acceptance Criteria

- [ ] At <768px viewport, the post editor renders the new mobile layout (no two-column row, no `lg:` desktop layout visible).
- [ ] The AI Assistant is reachable in ≤1 tap from any state of the editor via a persistent "Chat" trigger button.
- [ ] Opening the AI Assistant does not navigate away from the editor (per recommended option A — bottom sheet).
- [ ] The chat textarea remains fully visible above the iOS Safari virtual keyboard when focused.
- [ ] The Format & Insert popover surfaces every tool currently available on desktop (pillars, hashtags, emoji, library insert, template picker, save snapshot, save as template) — no feature cut.
- [ ] The header `…` overflow menu surfaces every desktop action that doesn't fit in the primary action button (preview, version history, hook analyzer, LinkedIn share, mark posted, archive, delete) — no feature cut.
- [ ] Formatting/header rows fit within a 375px viewport (iPhone SE) without horizontal scroll.
- [ ] LinkedIn preview, when expanded on mobile, renders at ~322px width to match LinkedIn iOS post-card width.
- [ ] Image upload and AI image generation dialogs open as full-screen sheets on mobile (not centered modals that overflow).
- [ ] Save / autosave behavior on mobile is identical to desktop — same debounce, same `lastSavedAt`, same status indicator semantics.
- [ ] All workspace/team features (Comments tab, Activity tab, Approval controls, Assign Post) are reachable on mobile via the overflow menu, opening as full-screen sheets.
- [ ] Bottom-sheet UI (chat sheet, format sheet) does not occlude the BP-099 P2 mobile tab bar's tap targets when at peek height.
- [ ] No JS user-agent sniffing or `window.innerWidth` reads anywhere in the new code path. Pure Tailwind responsive gates.
- [ ] Tested on iOS Safari (iPhone 13 / SE) and Android Chrome (Pixel) via Vercel preview before merging.

---

## 11. Out of Scope

- **The Launch Pad mobile shell.** Already shipped to develop in BP-099 Phase 2 (`bp-099-phase-2-mobile`). The mobile editor sits *inside* that shell.
- **Tablet-specific layouts.** ≥768px gets the existing desktop layout. Tablets-in-portrait may benefit from a hybrid in the future, but not in this BP.
- **Native app wrappers** (iOS/Android shells, PWA install prompts). Web only.
- **Post creation flow.** Already handled by `NewPostTitleDialog` from BP-099 P1 — covered for both desktop and mobile entry points.
- **AI provider settings / model picker on mobile.** Settings page mobile redesign is out of scope; settings page is rare-visit territory and the existing responsive handling there is acceptable.
- **Post analytics page redesign.** BP-021 already covered analytics; not revisiting on mobile here.
- **Tutorial overlay redesign for mobile.** The Tutorial SDK has its own mobile work tracked elsewhere (referenced in BP-149 / BACKLOG line 627). This BP exposes `data-tour-id` anchors on the mobile editor surfaces but does not redesign the tutorial overlay UX.
- **Migrating other dialogs (Schedule, Publish Preview, Mark Posted) to the new bottom-sheet primitive.** They render as full-screen sheets on mobile via existing CSS in V1. A future BP can unify all dialogs onto the bottom-sheet primitive once it proves itself in the chat + format sheets.
- **Voice input** for the AI chat.
- **Reordering or hiding individual editor surfaces by user preference.** No customization in V1; the layout is fixed.

---

## 12. Open Questions for the Owner

1. **Bottom-sheet primitive: extend shadcn `Sheet` or add `vaul`?** `Sheet` doesn't support snap points or peek mode out of the box. `vaul` (Emil Kowalski's headless drag-to-snap library, MIT, ~7kb gzipped, used by linear.app, dub.co, etc.) is the cleanest path. Cost is one new dependency. Are we OK adding it?

2. **One snap point or two?** Two snap points (peek ~30vh + full ~85vh) gives the user a "glance at the AI without losing the draft" mode. One snap point (full only, with drag-down to dismiss) is simpler. Owner's call — recommendation is **two snap points** for the chat sheet, **one snap point (full)** for the format sheet (the format sheet is a menu, not a conversation; peek mode is meaningless).

3. **Should `Publish` and `Schedule` be peer buttons or one button with a chooser?** Recommendation is keep Publish prominent and tuck Schedule in the `…` menu. But scheduling is a hero use case for some users — they may want both up front. Alternative: one "Publish…" button that opens a sheet with two options ("Publish now" / "Schedule for later"). Owner pick.

4. **Version history dropdown on mobile — drop entirely or keep in the `…` menu?** Today it's a real-estate hog with auto-snapshots, manual snapshots, restore, compare. Recommendation is keep it but move it behind a "Version history" entry in the `…` menu, opening as a full-screen sheet listing versions. Drop the auto/manual toggle on mobile (always show all versions, ordered most-recent-first).

5. **Workspace/team features — full screen sheet, separate route, or hide on mobile?** Comments and Activity tabs on desktop sit alongside the AI Assistant in the right panel. On mobile we either (a) tuck them into the `…` menu opening as full-screen sheets, (b) make them their own routes (`/posts/[id]/comments`, `/posts/[id]/activity`), or (c) hide on mobile entirely. Recommendation is (a) — full-screen sheet from the overflow menu. Owner pick.

6. **Does the chat sheet auto-open after the user generates a draft from a brainstorm?** Today, when arriving via `?fromIdea=…`, the AI panel auto-opens on desktop. Should the mobile bottom sheet do the same — auto-snap to peek so the user sees "I'm drafting…" without tapping? Recommendation: yes, auto-open to peek; the user can dismiss with one tap.

7. **Quick suggestion chips — show how many on first paint?** Five chips don't fit in a 390px row at default font size. Options: (a) horizontal scroll, default-show all (recommendation), (b) show three, "more" expands, (c) drop chips on mobile entirely (the chat input gets full width). Owner pick.

8. **What's the chat trigger affordance?** Options: (a) a floating action button (FAB) at the bottom-right of the editor labeled with a `Bot` icon, (b) a pill-shaped button labeled "Chat with AI" pinned just above the keyboard area, (c) inline "Ask AI" buttons next to specific surfaces (title, content, image), (d) all of the above. Recommendation: (b) — a pinned pill above the BP-099 P2 mobile tab bar, always visible, never occluded. (a) competes visually with the BP-099 P2 FAB on Launch Pad; (c) is too easy to miss.

---

## 13. Effort Estimate

| Phase | Scope | Estimate |
|---|---|---|
| Phase 1 | Mobile editor scaffolding: `MobilePostEditor`, `MobileEditorHeader`, `MobileEditorActions`, page-level conditional render, primary action button | 2 days |
| Phase 2 | Bottom-sheet primitive (decision pending §12 Q1) + `MobileAiSheet` with chat content + virtual-keyboard handling | 2–3 days |
| Phase 3 | `MobileFormatSheet` + `MobileImageBlock` + `MobileLinkedInPreviewCollapsible` + image dialog mobile sheet variants | 2 days |
| Phase 4 | Overflow menu wiring: Comments / Activity / Approvals / Version history / Mark Posted / Archive / Delete as full-screen sheets | 1–2 days |
| Phase 5 | iOS Safari + Android Chrome QA via Vercel preview, virtual-keyboard testing on real devices, accessibility pass | 1 day |
| **Total** | All phases | **8–10 days** |

This bumps the original BACKLOG estimate (5–8 days) up by ~2 days because the spec now includes the workspace/team features in the overflow menu and the LinkedIn preview width tightening, neither of which were called out in the stub.

---

## 14. Anchor File References (for implementation phase)

| Purpose | File |
|---|---|
| Page-level conditional render (the only file modified outside `src/components/posts/mobile/`) | `src/app/(app)/posts/[id]/page.tsx` |
| Existing inline AI chat UI (lift state, leave inline JSX behind) | `src/app/(app)/posts/[id]/page.tsx` lines ~2425–2700 |
| Existing two-column layout to gate behind `hidden md:flex` | `src/app/(app)/posts/[id]/page.tsx` line 1867 (`<div className="flex flex-1 gap-4 overflow-hidden">`) |
| Existing right-panel toggle (delete or gate to `hidden md:inline-flex`) | `src/app/(app)/posts/[id]/page.tsx` lines 1675–1704 |
| Sibling mobile-shell components (read for pattern reference) | `src/components/launch-pad/mobile-tab-bar.tsx`, `mobile-fab.tsx`, `mobile-launch-pad.tsx` (on `bp-099-phase-2-mobile` branch) |
| Existing global mobile-nav (different concern; do not touch) | `src/components/layout/mobile-nav.tsx` |
| Tailwind config (`md` breakpoint = 768px) | `tailwind.config.*` (default) |
| New mobile component directory | `src/components/posts/mobile/` (does not exist yet) |
| Root viewport meta (for `interactive-widget=resizes-content`) | `src/app/layout.tsx` |

---

## 15. Cross-References

- **BP-099 — Launch Pad** ([design doc](bp-099-guided-ui-mode.md)) — sibling. Phase 2 ships the bottom tab bar that this BP's editor sits inside.
- **BP-090** — `window.location.reload()` in post editor — flagged in BACKLOG as worth checking for mobile relevance. The reload at line 1835 (`onChange={() => window.location.reload()}` in approval controls) will dump unsaved chat state on mobile if it fires; consider replacing with a softer refresh during this BP's implementation.
- **BP-114** — `user_profiles` rename (already shipped) — no schema change in this BP.
- **BP-142** — Onboarding integrity gate (already shipped to develop) — unrelated; mobile editor doesn't gate on profile fields.
- **BP-149** — Tutorial SDK reliability fixes (already shipped). Tutorial overlay on mobile is its own work — this BP exposes `data-tour-id` anchors on mobile surfaces but doesn't redesign the overlay.

---

## 16. Implementation Branching

The branch `bp-143-mobile-editor` already exists (created 2026-04-27) but is empty — created off the BP-099 starting point and never committed against. Before implementation:

1. Rebase `bp-143-mobile-editor` onto current `develop` (post-BP-099-Phase-2 merge), so the new mobile shell is the starting point.
2. Open Phases 1–5 above as separate commits / PRs, in sequence. Phase 2 is the riskiest (bottom-sheet primitive + virtual keyboard handling); land Phase 1 first so the scaffolding is reviewable in isolation.
3. Verify on Vercel preview before each merge to develop. iOS Safari + Android Chrome are the two browsers that matter; desktop Chrome must show no regression.

This spec doc itself was drafted on a separate branch (`bp-143-mobile-editor-spec`) so the implementation branch can be rebased cleanly against develop without merging the doc through that branch.
