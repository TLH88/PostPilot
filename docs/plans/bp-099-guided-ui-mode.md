# BP-099 — Focus View (Simplified UI Mode)

> Author: Owner + design agent, 2026-04-27 (revised)
> Backlog: [BACKLOG.md BP-099](../BACKLOG.md)
> Status: Direction agreed with owner — awaiting final sign-off before implementation.
>
> **Naming note:** Previously called "Guided Mode" / "Conversational Assistant." Renamed to **Focus View** based on owner direction 2026-04-27. The earlier coaching-panel concept has been replaced with a simpler launcher-hub model. Sibling BPs spun off: BP-142 (Onboarding integrity gate) and BP-143 (Mobile editor layout).
>
> **Scope note:** This is a design document only. No code has been written or modified. All file paths referenced are anchors for the implementation phase.

---

## 1. Concept

Focus View is a simplified, opinionated home page that surfaces the four actions a user takes most often as large, self-explanatory cards. It replaces the dashboard for users who choose it during onboarding. It is **not** a coaching panel layered over the existing UI — it is a different home page with different navigation.

**Why this shape (vs. the original "Guided Mode" coach panel):**
- Less technical users get overwhelmed by *the decision of what to do*, not by the individual feature UIs once they're in them. Reducing the home page to four obvious choices is a bigger UX win than narrating each step.
- A persistent coach panel competes with the existing right-side AI Assistant on the post editor. A launcher hub avoids that conflict entirely.
- Users who choose Focus View at onboarding can switch to the standard dashboard at any time via a clearly-labeled toggle. Users who choose Standard get the existing app unchanged.

### Mockup References

The desktop launcher overlay, an alternate dark variant, and the mobile-shell concept the owner sketched are stored under `docs/images/bp-099/` (`focus-view-desktop-light.png`, `focus-view-desktop-dark.png`, `focus-view-mobile-shell.png`). Implementation should treat these as directional, not pixel-exact.

---

## 2. The Four Cards

Focus View's home is four primary cards, in this order:

| # | Card | What it does | Routes to |
|---|---|---|---|
| 1 | **Create a Post** | Start a fresh post from scratch | `/posts/new` (existing editor) |
| 2 | **View Draft Posts** | Return to unfinished drafts | `/posts?status=draft` |
| 3 | **View Scheduled Posts** | Check the upcoming pipeline | `/calendar` |
| 4 | **Generate New Ideas** | Open AI brainstorming | Idea Generator modal on `/ideas` |

**Why these four:**
- They map to the regular session rhythm: *new content → unfinished work → upcoming pipeline → idea fuel*.
- Cards are framed as *user actions*, not data states. A fixed grid is intentional — context-aware menus add cognitive load for the audience this view targets.
- "Edit a Post" and "Review a Post" (early mockup variants) are deliberately excluded: drafts cover unfinished work, and review-before-publish lives inside the editor.

Each card has: an icon, a 2–4 word title, a one-sentence description, and a primary action button.

---

## 3. Page Anatomy (Desktop)

```
┌────────────────────────────────────────────────────────────────────┐
│  PostPilot logo                       [?] [👤▼] [🌗] [⇄ Full View] │  ← top bar
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│             What would you like to do today?                       │
│         Pick an action below to get started.                       │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  ✏️       │  │  📝       │  │  🗓        │  │  💡       │            │
│  │ Create   │  │ Drafts   │  │ Scheduled│  │ Ideas    │            │
│  │ a Post   │  │          │  │          │  │          │            │
│  │          │  │          │  │          │  │          │            │
│  │ Start a  │  │ Pick up  │  │ See your │  │ Brain-   │            │
│  │ fresh    │  │ where    │  │ upcoming │  │ storm    │            │
│  │ draft    │  │ you left │  │ pipeline │  │ topics   │            │
│  │          │  │ off      │  │          │  │ with AI  │            │
│  │ [Start]  │  │ [Open]   │  │ [View]   │  │ [Open]   │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Top Bar Utilities (right side, in this order)

1. **Help** (`?` icon) — opens help center / docs
2. **Account dropdown** (avatar) — Settings, Sign out
3. **Theme toggle** — Light / Dark
4. **View toggle** — switches to Standard (full) view

The view toggle is the rightmost element so it's the most discoverable. Copy is explicit: **"Switch to Full View — shows all menus, tools, and advanced features. You can switch back anytime."** A confirm dialog appears on click; one click in the dialog applies the change immediately and persists it to `user_profiles`.

### No Esc-key exit

Per owner direction, the Esc key is **not** wired to switch views. The toggle button is the only path. This avoids the user accidentally bailing out of Focus View by hitting Escape on a modal.

---

## 4. The Mobile UI is a Separate Architecture

**Mobile users do not see a Focus View / Standard View choice.** They get a single mobile-native UI: a bottom tab bar with center "+" FAB. This is its own redesign and is tracked under **BP-143 — Mobile Editor Layout** (the post-editor portion is the meatiest unknown there).

What BP-099 ships for mobile:
- Bottom tab bar shell with: **Home · Posts · [+] · Calendar · Settings**
- The center [+] FAB launches a "what kind of post?" sheet (or directly opens a new draft — TBD in BP-143)
- The four-card Focus View layout adapts to mobile by stacking the cards vertically (per the third owner mockup)

What BP-099 does **not** ship for mobile (handed to BP-143):
- The mobile post-editor layout (draft + AI assistant + tools on a small screen)
- Mobile-specific image picker / generator UX
- Any tablet-specific breakpoint work

Device detection is straightforward: a viewport-width breakpoint check in the root layout (`src/app/(app)/layout.tsx`) plus a user-agent fallback for edge cases. No native app, no PWA-specific code in V1.

---

## 5. Onboarding Choice + Integrity Gate

### The Onboarding Card

A new step is added to the onboarding wizard: **"Choose your home screen."** The card shows two side-by-side previews (screenshots / illustrations) — Focus View on the left, Standard Dashboard on the right — with a short label under each:

- **Focus View** — "A simple home with the most common actions. Best if you're new to PostPilot."
- **Standard Dashboard** — "The full app with all menus and tools. Best if you want everything visible at once."

User picks one. Selection is saved to `user_profiles.ui_mode` (new column, enum: `'focus' | 'standard'`).

### Cannot Be Skipped

The owner has flagged a broader concern: **users must not be able to skip required onboarding steps**, period. This is not specific to Focus View — voice profile, LinkedIn connection, tier choice, and now UI-mode choice are all required. If a user somehow lands in the app with any of those fields null (e.g., they closed the wizard mid-flow, or a future schema change adds a new required field that older accounts haven't filled), the system must catch it and re-prompt before granting access.

This validation gate is its own feature and is tracked under **BP-142 — Onboarding Integrity Gate**. BP-099 declares `ui_mode` as a required onboarding field and depends on BP-142 to enforce it on every login.

### Default if Somehow Missing

If a user's `ui_mode` is null at login (BP-142 has not yet shipped, or a backfill missed someone), the login layout defaults to **Focus View** rather than crashing. This is a soft default; BP-142's gate will then prompt them to make an explicit choice on next login. Existing accounts at rollout are backfilled to `'standard'` so their experience does not change without their consent.

---

## 6. Routing & Login Behavior

### Default Landing on Login

When a user logs in, the root route (`/`) checks `user_profiles.ui_mode`:
- `'focus'` → render Focus View home
- `'standard'` → render existing dashboard
- `null` → render Focus View as a soft default; BP-142 gate will re-prompt

### Deep Links Bypass Focus View

Direct navigation to a specific URL (e.g., `/posts/123` from an email notification) **always** routes to that URL. Focus View is the *default landing on login*, not a forced cage. A user reading a notification email and clicking through should land on the post they're being asked about — not the launcher.

### Returning to Home

From any page reached via a Focus View card, a clearly-labeled **"← Back to Home"** affordance returns the user to Focus View home. On desktop this lives in the top bar (replacing or sitting next to the standard breadcrumb). On mobile it's the Home tab in the bottom nav.

---

## 7. Post-Task "What Next?"

After a user completes a task they started from a Focus View card, the system shows a short, contextual "What would you like to do next?" prompt with curated options. This replaces the original doc's persistent coach panel — the prompt is a single deliberate moment, not a constant presence.

| Just completed | Suggested next options |
|---|---|
| Created/scheduled a post | View calendar · Create another post · Generate ideas · Done for today |
| Finished/published a draft | View calendar · Back to drafts · Create new post · Done for today |
| Generated ideas (saved at least one) | Develop one of these now · Generate more · Done for today |
| Viewed scheduled posts | *(Passive view — no "what next?" prompt; only a "Back to Home" button)* |

**"Done for today"** is an unusual but deliberate option: it gives non-power users explicit closure on the work session and either signs them out or returns them to a "see you tomorrow" home state. Owner endorsed during 2026-04-27 brainstorm.

The prompt appears as an inline section on the page where the task ended — not a modal, not a full-screen takeover. It is dismissible (small ✕). Dismissing returns the user to a passive view of the page they're on (e.g., the calendar after scheduling a post).

---

## 8. Switching Views Mid-Task

If a user is in the middle of a task (e.g., editing a draft) and clicks the view toggle, the system:

1. Auto-saves the current draft (uses existing autosave path).
2. Shows a confirm dialog: **"Switch to [Full View / Focus View]? Your draft has been saved. You can return to it from [View Draft Posts / the Posts page]."**
3. On confirm, applies the new mode and routes the user to the new view's home.
4. On cancel, dismisses the dialog and leaves the user where they were.

The dialog must explicitly tell the user *where* their work is so they know how to return. This is a hard requirement — silent context loss is the failure mode to avoid.

---

## 9. Data Model

### One New Column on `user_profiles`

```sql
-- Implementation phase migration (not yet written)
ALTER TABLE user_profiles
  ADD COLUMN ui_mode text NOT NULL DEFAULT 'focus'
  CHECK (ui_mode IN ('focus', 'standard'));

-- Backfill for existing accounts at rollout: keep their current experience
UPDATE user_profiles SET ui_mode = 'standard' WHERE created_at < '<rollout-date>';
```

The original doc proposed `guided_mode_enabled boolean` and `guided_workflows_dismissed jsonb`. Both are dropped. There are no per-workflow dismissal flags in Focus View because there are no workflows in the original sense — the user picks a card, the card opens the relevant feature, and the existing UI takes over.

### Removed from the Original Doc

- `GuidedModeEngine` state machine — not needed; cards are direct navigation
- `setupActionDetector()` reuse from Tutorial SDK — not needed; no step detection
- `postStatusChange` and `streamComplete` custom detectors — not needed
- `useUserState()` hook for context-aware menu filtering — not needed; the four cards are fixed
- Workflow definition files under `src/lib/guided-mode/workflows/` — not needed
- `data-tour-id`-driven step targeting — not needed for Focus View itself (still used by Tutorial SDK for one-shot tutorials, untouched by this BP)

This is a meaningful simplification: the V1 implementation surface is roughly 1/3 the original scope.

---

## 10. Settings Surface

In Settings, a new section **"Appearance"** (or extension of an existing one) contains:

- **Home Screen** dropdown — *Focus View / Standard Dashboard* (writes `ui_mode`)
- **Theme** — *Light / Dark / System* (existing)

A short explainer under the Home Screen control: *"Focus View shows a simplified home with the most common actions. Standard Dashboard shows the full app. You can switch from any page using the toggle in the top right."*

---

## 11. Tier Availability

**Available to all tiers — Free, Personal, Professional — with no restrictions.** Same reasoning as the original doc: Focus View is onboarding/usability infrastructure, not a differentiating capability. Free users are the primary audience.

---

## 12. Out of Scope for V1

- Per-card customization (user reordering or replacing the four cards)
- Additional workflow types (ad-hoc "Connect LinkedIn" or "Set up voice profile" cards) — these are pushed to onboarding, not Focus View
- Workflow analytics / completion metrics (capture as future BP if needed)
- Tablet-specific breakpoint work (mobile + desktop only in V1)
- The mobile post-editor layout (handed off to BP-143)
- Onboarding integrity validation logic (handed off to BP-142)
- Spotlight overlays / dim-and-highlight (the original doc's Q5 — no longer relevant)

---

## 13. Phasing

### Phase 1 — Focus View desktop home + view toggle

**Estimated effort: 4–5 development days**

Acceptance criteria:
- [ ] `user_profiles.ui_mode` column exists; default `'focus'` for new accounts; existing accounts backfilled to `'standard'`
- [ ] Root route (`/`) renders Focus View when `ui_mode = 'focus'`, existing dashboard when `'standard'`
- [ ] Four cards (Create / Drafts / Scheduled / Ideas) render with icons, copy, and primary buttons; each routes to the correct destination
- [ ] Top-bar utilities present: Help, Account dropdown, Theme toggle, View toggle (in that order)
- [ ] View toggle (Focus View top bar AND Standard view top-right menu) shows the explicit-consequence dialog before switching
- [ ] Mid-task switch auto-saves drafts and shows the "your draft has been saved at X" confirmation
- [ ] Deep links bypass Focus View (e.g., direct `/posts/123` works regardless of `ui_mode`)
- [ ] No regression in standard UI for users with `ui_mode = 'standard'`

### Phase 2 — "What next?" prompts + mobile shell

**Estimated effort: 3–4 development days**

Acceptance criteria:
- [ ] Post-task prompts appear inline on the relevant pages (post create/schedule, draft publish, idea save)
- [ ] Each prompt shows the contextual options from the §7 table
- [ ] "Done for today" option is wired (returns to a passive home / sign-out flow)
- [ ] Mobile detection routes mobile devices to the bottom-nav shell regardless of `ui_mode`
- [ ] Mobile bottom nav: Home / Posts / [+] / Calendar / Settings
- [ ] Mobile Home renders the four cards stacked vertically
- [ ] Mobile users do not see the Focus/Standard toggle anywhere (mobile UI is fixed)

### Phase 3 — Onboarding card + integrity gate hand-off

**Estimated effort: 1–2 development days (BP-099 portion only)**

Acceptance criteria:
- [ ] New onboarding step "Choose your home screen" with two preview cards
- [ ] Selection persists to `user_profiles.ui_mode`
- [ ] Settings → Appearance → Home Screen control reads and writes `ui_mode`
- [ ] BP-099 declares `ui_mode` as a required onboarding field; BP-142 (separate spec) enforces non-null on every login

### Phase 4 — Polish

**Estimated effort: 1–2 development days**

- [ ] Empty-state copy on each card when the underlying data is empty (e.g., "View Draft Posts" card subtitle changes when there are no drafts)
- [ ] Subtle hover/focus animations
- [ ] Accessibility pass (keyboard nav across cards, ARIA labels on the view toggle)

---

## 14. Risk Assessment

### Risk 1 — Users who chose Focus View can't find the toggle to switch to Standard

**Severity: Medium.** If the toggle is too subtle in the top bar, a user who outgrows Focus View doesn't know how to "graduate" and may churn instead.

**Mitigation:** The toggle is the rightmost element in the top bar with explicit text ("Full View"), not just an icon. The settings page also surfaces the same control. Consider an unobtrusive nudge after N days or after the user has published M posts: *"Want to see more tools? Try Full View."* (Defer to Phase 4 polish, not V1.)

### Risk 2 — Mobile + desktop modes drift

**Severity: Medium.** Two layouts, two code paths, two sets of bugs. As the product evolves, the mobile shell must keep pace with desktop.

**Mitigation:** Mobile is its own architecture (BP-143 carries the editor). For the four cards specifically, share the underlying card components between desktop and mobile — only the layout container differs. Document the shared component as part of Phase 2 acceptance.

### Risk 3 — Onboarding integrity gate (BP-142) is delayed

**Severity: Low-Medium.** BP-099 declares `ui_mode` as required, but if BP-142 ships later, users who close the onboarding wizard mid-flow may end up with `ui_mode = null` (the soft-default kicks them to Focus View, which is fine — but then they can't get back to make a deliberate choice without going to Settings).

**Mitigation:** Ship BP-099 with a soft-default to `'focus'` so the app always works. Open BP-142 as a sibling P1. Until BP-142 lands, accept that the worst case is "user sees Focus View by default and can switch in Settings" — not a broken experience.

### Risk 4 — The "Switch View" toggle is misclicked frequently

**Severity: Low.** A user clicks the toggle thinking it does something else (e.g., a theme switcher next to it), and is suddenly in a different layout.

**Mitigation:** The confirm dialog is the safety net. Verify in QA that the dialog fires every time, with no "don't ask again" option in V1. Reconsider after rollout if the dialog becomes friction for power users.

---

## 15. Effort Estimate

| Phase | Scope | Estimate |
|---|---|---|
| Phase 1 | Focus View desktop home + view toggle | 4–5 days |
| Phase 2 | "What next?" prompts + mobile shell | 3–4 days |
| Phase 3 | Onboarding card + BP-142 hand-off declaration | 1–2 days |
| Phase 4 | Polish (empty states, a11y, animations) | 1–2 days |
| **Total** | All four phases | **9–13 days** |

This is meaningfully smaller than the original Guided Mode estimate (15–21 days) because the workflow engine, action detectors, and per-workflow definitions are all dropped.

**Sibling BPs (separate effort, not counted above):**
- **BP-142** — Onboarding Integrity Gate — separate estimate
- **BP-143** — Mobile Editor Layout — separate estimate (likely 5–8 days)

---

## 16. Open Questions Resolved

| Original Q | Resolution |
|---|---|
| Q1: Persistent right-panel vs. slide-out drawer | **N/A.** Replaced with launcher-hub model — no persistent panel at all. |
| Q2: Default ON for new accounts? | **No silent default.** User picks in onboarding (BP-142 enforces). Soft default to Focus View if somehow missing. |
| Q3: Welcome prompt frequency | **N/A.** No welcome prompt; Focus View *is* the home. |
| Q4: Session-only "explore" bypass | **N/A.** No session bypass; user toggles to Standard view explicitly. |
| Q5: Spotlight UI elements? | **N/A.** No coaching steps to spotlight. |
| Q6: Track "explore" event? | **N/A.** No "explore" event exists. Track view-toggle usage in Phase 4. |
| Q7: Show the panel on every page? | **N/A.** No panel. Top-bar toggle is the only persistent surface. |

---

## Anchor File References (for implementation phase)

| Purpose | File |
|---|---|
| App shell layout (Focus View routing decision lives here) | `src/app/(app)/layout.tsx` |
| Existing dashboard (Standard view target) | `src/app/(app)/dashboard/` (or wherever the current home renders) |
| Settings page (Appearance section) | `src/app/(app)/settings/` |
| User profile table (schema migration target) | `user_profiles` (Supabase, post-BP-114) |
| Onboarding wizard (new "Choose your home screen" step) | Search codebase for current onboarding card flow (BP-103 / BP-135 region) |
| Top-bar component (view toggle placement) | Search codebase for the current top-right menu used by theme toggle |
| Mockup images | `docs/images/bp-099/` (to be added — see §1) |

---

## Cross-References

- **BP-035** — Tutorial SDK (separate concern; Tutorial SDK still runs feature-specific one-shots inside Focus View pages without conflict)
- **BP-084** — Tutorial card visual redesign (visual language reuse for the onboarding "choose your home screen" card)
- **BP-114** — `user_profiles` rename (already shipped; this BP lands the new column on the renamed table)
- **BP-115 / BP-117** — Subscription Model v2 / feature gates (Focus View is not gated; available to all tiers)
- **BP-142** — Onboarding Integrity Gate (sibling, declares `ui_mode` as a required field)
- **BP-143** — Mobile Editor Layout (sibling, carries the in-editor mobile UX)
