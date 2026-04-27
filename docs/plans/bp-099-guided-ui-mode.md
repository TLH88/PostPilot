# BP-099 — Simplified Guided UI Mode (Conversational Assistant)

> Author: Design agent, 2026-04-27
> Backlog: [BACKLOG.md BP-099](../BACKLOG.md)
> Status: Design landed — awaiting owner review before implementation begins.
>
> **Scope note:** This is a design document only. No code has been written or modified. All file paths referenced are anchors for the implementation phase.

---

## 1. Architecture Overview

Guided Mode is a persistent overlay layer that augments the existing PostPilot UI without replacing it. The standard app continues to function exactly as it does today for power users. When Guided Mode is on, an assistant panel appears alongside the existing UI and narrates what the user should do next — but every actual action happens in the real components.

### Component Map

```
┌──────────────────────────────────────────────────────────────────┐
│  PostPilot App Shell  (src/app/(app)/layout.tsx)                 │
│                                                                  │
│  ┌────────────────────────────────┐  ┌───────────────────────┐  │
│  │  Main Content Area             │  │  Guided Assistant     │  │
│  │  (unchanged existing UI)       │  │  Panel (new)          │  │
│  │                                │  │                       │  │
│  │  • Dashboard                   │  │  Chat-style messages  │  │
│  │  • Post Editor                 │  │  Suggested actions    │  │
│  │  • Idea Bank                   │  │  Skip / exit controls │  │
│  │  • Calendar                    │  │                       │  │
│  │  • Settings                    │  │  ↕ driven by          │  │
│  │                                │  │    Guided Engine      │  │
│  └────────────────────────────────┘  └──────────┬────────────┘  │
│                                                  │               │
│  ┌───────────────────────────────────────────────▼────────────┐  │
│  │  GuidedModeEngine (src/lib/guided-mode/engine.ts) (new)    │  │
│  │  State machine: activeWorkflow, currentStep, messages[]    │  │
│  │  Delegates action detection → Tutorial SDK detectors       │  │
│  └───────────────┬───────────────────────┬────────────────────┘  │
│                  │                       │                        │
│   ┌──────────────▼──────────┐  ┌─────────▼────────────────────┐  │
│   │  Tutorial SDK           │  │  Supabase real-time /        │  │
│   │  setupActionDetector()  │  │  targeted polling            │  │
│   │  (packages/tutorial-    │  │  (post status, idea count)   │  │
│   │   sdk/src/core/         │  └──────────────────────────────┘  │
│   │   action-detector.ts)   │                                    │
│   └─────────────────────────┘                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Where State Lives

| Concern | Location | Notes |
|---|---|---|
| `guided_mode_enabled` toggle | `user_profiles.guided_mode_enabled` (new boolean column) | Persisted per user; read on login |
| Active workflow + current step | React context (`GuidedModeContext`) — in-memory only | No cross-session resume in V1 |
| Message history for the panel | In-memory within context | Cleared on workflow end |
| "Don't show this workflow's intro" | `user_profiles.guided_workflows_dismissed` (jsonb column) | Already in spec |
| Workflow definitions | `src/lib/guided-mode/workflows/` (new directory) | Static TypeScript config files, one per workflow |

### Integration Point with the App Shell

The `GuidedModeProvider` wraps the `(app)` route group layout (`src/app/(app)/layout.tsx`). It renders nothing visible when `guided_mode_enabled` is false. When enabled, it renders the assistant panel (§3) as a fixed right-side overlay and subscribes to route changes via Next.js's `usePathname`.

---

## 2. Workflow Engine State Machine

### Recommendation: Pure JSON / TypeScript Config Objects

Do **not** use a DSL or code-defined switch logic. Define each workflow as a plain TypeScript object that is loaded by the engine. This is the same pattern already used by the Tutorial SDK (`TutorialDefinition` in `packages/tutorial-sdk/src/core/types.ts`). The engine is the interpreter; the workflow file is just data. This keeps workflow authoring accessible without requiring a developer every time copy needs to change.

### Guided Workflow Data Shape

```typescript
// src/lib/guided-mode/types.ts (new file — design only, not yet written)

type GuidedActionType =
  | "click"           // reuses Tutorial SDK click detector
  | "navigate"        // reuses Tutorial SDK navigate detector
  | "formInput"       // reuses Tutorial SDK formInput detector
  | "elementExists"   // reuses Tutorial SDK elementExists detector
  | "postStatusChange"  // new: poll post row until status matches expected
  | "streamComplete"    // new: wait for AI assistant streaming to stop
  | "manual";           // user clicks "Done" / "Next" themselves

interface GuidedStep {
  id: string;
  // Message rendered in the assistant panel (supports markdown)
  prompt: string;
  // Short label shown in the panel header during this step (e.g., "Step 2 of 7")
  stepLabel?: string;
  // The action the engine waits for before advancing
  action: GuidedActionType;
  // Selector / route / element for action detection (mirrors TutorialStep fields)
  clickTarget?: string;
  waitForRoute?: string;
  waitForElement?: string;
  // For postStatusChange: the post status value to wait for
  waitForPostStatus?: "draft" | "scheduled" | "posted";
  // Message shown after the action is detected (before moving to next step)
  successMessage?: string;
  // Suggested action buttons shown in the panel for this step
  suggestedActions?: GuidedSuggestedAction[];
  // Whether this step can be skipped
  skippable?: boolean;
  // How long (ms) before showing "Need help?" prompt (default: 20000)
  timeout?: number;
  // data-tour-id attribute value to spotlight (optional, same as Tutorial SDK)
  spotlightTarget?: string;
}

interface GuidedSuggestedAction {
  label: string;
  // If set, clicking this button navigates the user rather than waiting for them
  navigateTo?: string;
  // If set, clicking opens a modal by triggering a selector click
  triggerSelector?: string;
  // If "skip", advances the step without completing the action
  variant?: "primary" | "secondary" | "skip";
}

interface GuidedWorkflow {
  id: string;
  name: string;
  // Short description shown in the "What would you like to do?" menu
  menuLabel: string;
  // Condition: only show this workflow in the menu if this returns true
  // Evaluated by useUserState() hook (§5)
  condition?: keyof UserStateFlags;
  steps: GuidedStep[];
  // Messages for the "What next?" prompt after the workflow completes
  completionMessage: string;
  whatNextOptions: GuidedWhatNextOption[];
}

interface GuidedWhatNextOption {
  label: string;
  workflowId: string | "explore" | "done";
  condition?: keyof UserStateFlags;
}
```

### Canonical Workflow — "Create a new AI-assisted post"

```typescript
// src/lib/guided-mode/workflows/create-post.ts (new file — design only)

export const createPostWorkflow: GuidedWorkflow = {
  id: "create-post",
  name: "Create a new AI-assisted post",
  menuLabel: "Create a new AI-assisted post",
  steps: [
    {
      id: "open-idea-generator",
      prompt: "Let's start by brainstorming a topic. Click **New Post** (or the Idea Generator button) to open the idea brainstorming tool.",
      action: "elementExists",
      waitForElement: "[data-tour-id='idea-generator-modal']",
      suggestedActions: [
        { label: "Open Idea Generator", navigateTo: "/ideas", variant: "primary" }
      ],
      timeout: 25000,
    },
    {
      id: "enter-topic",
      prompt: "Enter a topic you'd like to brainstorm about, pick a content pillar, then click **Generate**.",
      action: "click",
      clickTarget: "[data-tour-id='idea-generator-generate-btn']",
      spotlightTarget: "idea-generator-topic-input",
      timeout: 60000,
      skippable: false,
    },
    {
      id: "save-idea",
      prompt: "Great — here are your ideas. Pick at least one you like and save it to your Idea Bank.",
      action: "click",
      clickTarget: "[data-tour-id='idea-save-btn']",
      successMessage: "Idea saved!",
      timeout: 60000,
      skippable: false,
    },
    {
      id: "navigate-to-idea-bank",
      prompt: "Now let's develop that idea into a post. Head over to your Idea Bank.",
      action: "navigate",
      waitForRoute: "/ideas",
      suggestedActions: [
        { label: "Go to Idea Bank", navigateTo: "/ideas", variant: "primary" }
      ],
      timeout: 20000,
    },
    {
      id: "develop-idea",
      prompt: "Click **Develop** on the idea you want to turn into a LinkedIn post.",
      action: "navigate",
      waitForRoute: "/posts",
      spotlightTarget: "idea-develop-btn",
      timeout: 45000,
    },
    {
      id: "ai-drafting",
      prompt: "I'm drafting your post in the AI Assistant panel on the right. When it's done, review it — then click **Apply to Editor** to move it into the editor.",
      action: "streamComplete",
      waitForElement: "[data-tour-id='ai-assistant-apply-btn']",
      timeout: 90000,
      skippable: true,
    },
    {
      id: "review-draft",
      prompt: "Your draft is in the editor. Read it through — make any changes you like, or ask the AI assistant to revise it.",
      action: "manual",
      suggestedActions: [
        { label: "Looks good, move on", variant: "primary" }
      ],
      skippable: false,
      timeout: 0,
    },
    {
      id: "add-image",
      prompt: "Want to add an image? You can generate one with AI or upload your own from the **Post Image** section. Or skip this step.",
      action: "manual",
      suggestedActions: [
        { label: "I've added an image", variant: "primary" },
        { label: "Skip — no image", variant: "skip" }
      ],
      skippable: true,
    },
    {
      id: "publish-or-schedule",
      prompt: "Ready to share? You can **Publish now** to LinkedIn, or **Schedule** it for a later time.",
      action: "postStatusChange",
      waitForPostStatus: "posted",
      suggestedActions: [
        { label: "Publish now", triggerSelector: "[data-tour-id='publish-btn']", variant: "primary" },
        { label: "Schedule for later", triggerSelector: "[data-tour-id='schedule-btn']", variant: "secondary" }
      ],
      timeout: 120000,
      skippable: false,
    },
  ],
  completionMessage: "Your post is live! Nice work.",
  whatNextOptions: [
    { label: "Create another post", workflowId: "create-post" },
    { label: "Brainstorm more ideas", workflowId: "brainstorm" },
    { label: "I'm done for now", workflowId: "done" },
  ],
};
```

---

## 3. Assistant Panel UX

### Recommendation: Persistent Right-Side Panel

**Do not use a floating chip or a slide-out drawer.** Use a persistent, fixed-width right-side panel (320px on desktop).

**Why:**
- A floating chip hides information. The assistant's current message needs to be readable at a glance without the user clicking anything.
- A slide-out drawer competes with the Post Editor's existing AI Assistant drawer. PostPilot already has a right-side AI panel on the post editor page — a second drawer from the right causes confusion about which one to use.
- A persistent right panel mirrors the chat-like format the spec describes, is scannable, and doesn't cover the main content area. On mobile, it collapses to a bottom bar with the current message visible and a "tap to expand" affordance.

The panel should feel like a quiet coach, not an alert. It uses low-contrast surface styling (not a high-attention red or yellow card) so users don't feel badgered.

### Panel Anatomy

```
┌─────────────────────────────────────────┐
│  Guided Mode           [Exit guidance ×] │  ← header bar
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ 🤖  Step 3 of 9                   │  │  ← step counter
│  │                                   │  │
│  │  "Great — here are your ideas.    │  │  ← system message
│  │  Pick at least one you like and   │  │    (markdown-rendered)
│  │  save it to your Idea Bank."      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ✓ Idea saved!                     │  │  ← success message
│  └───────────────────────────────────┘  │   (appears after action)
│                                         │
│  [ Save idea to Idea Bank ]  (primary)  │  ← suggested action button
│  [ Skip this step ]          (text)     │  ← skip affordance
│                                         │
│  ─────────────────────────────────────  │
│  Need help?  ·  Exit guidance           │  ← footer
└─────────────────────────────────────────┘
```

### Message Format Rules

| Message type | Style | When shown |
|---|---|---|
| System / prompt | White bubble, assistant icon, markdown text | Every step |
| Success | Green tinted bubble, checkmark icon | After action detected |
| Off-script acknowledgement | Amber tinted bubble | When user clicks outside flow (§7) |
| "What next?" | Blue tinted, list of workflow options | After workflow completes |
| Error / timeout help | Yellow tinted, "Need help finding it?" with a direct link | After timeout fires |

### Off-Ramp Design

Every step shows a small "Exit guidance" text link in the panel footer. Clicking it shows a single inline confirm: "Turn off Guided Mode? You can re-enable it anytime in Settings." Confirm turns `guided_mode_enabled` to false and hides the panel. No modal, no page reload — the preference is saved to `user_profiles` in the background.

---

## 4. Action Detection Strategy

### Reuse Tutorial SDK for Four of Six Action Types

The four detectors in `packages/tutorial-sdk/src/core/action-detector.ts` — `click`, `navigate`, `formInput`, `elementExists` — are battle-tested and should be reused directly. The Guided Mode engine calls `setupActionDetector()` with a synthetic `TutorialStep` shaped object; no changes to the Tutorial SDK are needed.

### Two New Detector Types Required

**`postStatusChange`**

Needed for steps where the completion signal is a database record changing (e.g., post status becomes `scheduled` or `posted`). Implementation: subscribe to the Supabase real-time channel for the active post row's `posts` table, or poll `GET /api/posts/[id]` every 2 seconds for up to `timeout` ms. Real-time is preferable (less latency, no wasted requests) and PostPilot already uses Supabase; the channel pattern is established.

**`streamComplete`**

Needed for the AI drafting step: the engine should wait until the AI Assistant has finished streaming its response before prompting the user to review. Implementation: listen for a custom DOM event (`guidedMode:streamComplete`) dispatched by the AI Assistant component when its streaming state transitions from active to idle. The AI Assistant component (`src/app/(app)/posts/[id]/page.tsx` — the right-side panel) would emit this event as a one-liner addition at the appropriate state transition. This is a minimal coupling: the panel doesn't import anything from Guided Mode, it just dispatches a named DOM event.

### Integration Approach

1. The `GuidedModeEngine` calls `setupActionDetector()` from the Tutorial SDK for `click`, `navigate`, `formInput`, and `elementExists` steps — identical to how the Tutorial SDK's own engine (`packages/tutorial-sdk/src/core/engine.ts`) does it.
2. For `postStatusChange`, the engine registers a Supabase real-time subscription for the active post ID. Subscription is torn down on step advance or workflow exit.
3. For `streamComplete`, the engine adds a `document.addEventListener` for the custom DOM event. The AI Assistant emits the event; the engine listens.
4. The engine always runs the action detector cleanup function from `setupActionDetector()` when a step advances or a workflow exits — the same idempotent cleanup pattern already in the Tutorial SDK.

### Stable Selectors

Workflow steps reference `data-tour-id` attributes already placed by the Tutorial SDK work. Any new interaction points added for Guided Mode should get `data-tour-id` attributes rather than class or text-content selectors. This is already the convention; implementation should follow it.

---

## 5. Welcome Prompt + Context-Aware "What Next?"

### `useUserState()` Hook Spec

The hook is the single source of truth for which workflow options to show in the welcome prompt and the "What next?" menu.

```typescript
// src/lib/guided-mode/hooks/use-user-state.ts (new file — design only)

interface UserStateFlags {
  hasUnprocessedIdeas: boolean;     // ideas table has rows with status !== 'developed'
  hasUnpublishedDrafts: boolean;    // posts table has rows with status = 'draft'
  hasScheduledPosts: boolean;       // posts table has rows with status = 'scheduled'
  linkedInConnected: boolean;       // linkedin_connections row exists for user
  voiceProfileComplete: boolean;    // user_profiles.voice_profile is non-null and non-empty
  isNewAccount: boolean;            // user_profiles.created_at within last 7 days
}

function useUserState(): UserStateFlags
```

The hook fetches these booleans once on mount (a single lightweight Supabase query each) and caches them for the session. No real-time subscription needed for V1 — the welcome prompt recalculates on the next login or workflow completion.

### Welcome Prompt Option Logic

| Option | Condition |
|---|---|
| "Create a new AI-assisted post" | Always shown |
| "Develop an existing idea" | `hasUnprocessedIdeas === true` |
| "Schedule an existing draft" | `hasUnpublishedDrafts === true` |
| "Connect LinkedIn" | `linkedInConnected === false` |
| "Set up your voice profile" | `voiceProfileComplete === false` |
| "Just let me explore" | Always shown (closes panel for the session without disabling Guided Mode) |

### "What Next?" Post-Completion Options

After a workflow ends, the same `UserStateFlags` are re-evaluated (re-fetch to pick up changes made during the workflow) and the `whatNextOptions` array on the completed workflow is filtered against current state. This means "Develop an existing idea" won't appear in "What next?" after Brainstorm if the user didn't actually save any ideas.

---

## 6. Toggle + Persistence

### Database Change Required

Add one column and one jsonb field to `user_profiles`:

```sql
-- Implementation phase migration (not yet written)
ALTER TABLE user_profiles
  ADD COLUMN guided_mode_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN guided_workflows_dismissed jsonb NOT NULL DEFAULT '{}';
```

The BACKLOG spec references `creator_profiles` but that table was renamed to `user_profiles` in BP-114. Use `user_profiles`.

### Default Behavior

- **New accounts (after rollout):** `guided_mode_enabled = true` by default. First-login experience is Guided Mode from the start.
- **Existing accounts at rollout:** `guided_mode_enabled = false`. They see no change on deploy day — Guided Mode is opt-in for them. A single dismissible banner in the dashboard can promote it: "New: Guided Mode — let us walk you through PostPilot step by step. [Try it] [Dismiss]".

### Settings UI

Settings → new section **Guided Mode** (between Notifications and Privacy, or at the bottom of the General section). Contents:

- Toggle: "Guided Mode — let PostPilot walk you through tasks step by step"
- Link: "Reset all workflow progress" (clears `guided_workflows_dismissed`)
- Short explainer: "Guided Mode is available to all plans and can be turned off at any time."

### In-Flow Off-Ramp

As described in §3: "Exit guidance" text link in the panel footer, single inline confirm, saves preference immediately.

---

## 7. Off-Script Handling

When the user clicks something outside the current step's expected interaction (e.g., they navigate to Settings mid-workflow), the engine should detect this via the `navigate` detector watching for unexpected route changes.

### Recommended Pattern: Acknowledge + Offer Two Paths

The assistant panel immediately shows an amber message:

> "Looks like you opened **Settings**. Want help here, or should I keep helping you with **Create a new AI-assisted post**?"

Two buttons:
- **"Keep going with [workflow name]"** — navigates back to the last known workflow route and resumes
- **"Help me here instead"** — pauses the active workflow and starts the relevant workflow for the current context (if one exists), or dismisses to a "Just tell me what to do" freeform state

### Key Rule: Never Block the UI

Guided Mode is additive. If the user clicks away, they are not trapped. The off-script message is informational, not a gate. The existing UI continues to function exactly as normal. The assistant just updates its message.

### Timeout Fallback

If the user has been on a step for longer than `timeout` ms without completing the action, the panel shows:

> "Need help finding it? Here's where to look: [direct link or step-specific tip]."

If the step has `skippable: true`, a "Skip this step" button appears. This mirrors the existing timeout pattern in `packages/tutorial-sdk/src/core/timer.ts`.

---

## 8. Tier Interactions

**Guided Mode is available to all tiers — Free, Personal, and Professional — with no restrictions.**

This is the right call for three reasons:

1. **It's onboarding infrastructure, not a differentiating feature.** Guided Mode doesn't give any user a capability they didn't have before; it just helps them use what they already have access to.
2. **Free users are the primary audience.** The spec's strategic framing is correct: this is a viability multiplier for the Free→Pro conversion. Gating it defeats the purpose.
3. **No additional AI or compute cost.** Guided Mode is static-prompt, client-side state management. There is no AI inference involved. There is no marginal cost by tier.

The one tier-aware behavior: if a workflow step references a feature the user's tier doesn't have access to (e.g., a Free user on a step about image generation), the step's prompt should acknowledge the limit gracefully rather than directing them to a blocked action. Workflow definitions should flag tier-gated steps with a `requiredTier` field so the engine can substitute a "this is a Pro feature — [Upgrade] to unlock it, or skip this step" message. This is a low-priority V1 edge case since the canonical workflow targets features available on Free.

Cross-reference: BP-115 (Subscription Model v2), BP-117 (feature-gate refactor).

---

## 9. Migration: Coexistence with Existing Tutorials

The Tutorial SDK (BP-035, shipped) runs single-feature first-run tutorials: "Here's how to use the Idea Generator," "Here's what the Hook Analyzer does." Those are feature-scoped, short (3–8 steps), and fire once.

Guided Mode is end-to-end workflow coaching: "Let's get from zero to a published post together." It's session-long, branching, and repeatable.

### Recommended Boundary

| Concern | Tutorial SDK | Guided Mode |
|---|---|---|
| First time using a specific feature | Tutorial SDK | — |
| First-run for a new account | Tutorial SDK (if feature-specific intro needed) | Guided Mode (overall "what do you want to do?") |
| End-to-end task completion | — | Guided Mode |
| Repeatable coaching on demand | — | Guided Mode |
| "Don't show again" per-feature | Tutorial SDK | Per-workflow in `guided_workflows_dismissed` |

### Conflict Avoidance Rules

1. **Don't run both simultaneously.** The `GuidedModeProvider` should check whether the Tutorial SDK engine has an active tutorial (`isActive`) and suppress the Guided Mode panel until the tutorial closes. The Tutorial SDK takes priority for feature-specific introductions.
2. **Tutorials can hand off to Guided Mode.** A tutorial's final step (via `chainToTutorialId` or a custom `finishButtonText`) can offer "Want a full walkthrough? [Start Guided Mode]" — wiring up a `GuidedModeEngine.startWorkflow()` call. This is Phase 3–4 polish, not V1.
3. **Guided Mode does not re-trigger feature tutorials.** When the Guided Mode engine navigates the user to a new page (e.g., opens the Idea Generator), that should not re-fire the Idea Generator's one-shot tutorial if the user has already seen it.

---

## 10. Phasing

### Phase 1 — Engine + Assistant Panel + Canonical Workflow

**Estimated effort: 6–8 development days**

Acceptance criteria:
- [ ] `user_profiles.guided_mode_enabled` column exists; default `true` for new accounts
- [ ] `GuidedModeProvider` and `GuidedModeContext` added to `src/app/(app)/layout.tsx`; no visible change when mode is off
- [ ] Persistent right-side assistant panel renders when `guided_mode_enabled = true`
- [ ] Panel shows step counter, markdown-rendered prompt, suggested action buttons, skip link, and "Exit guidance" off-ramp
- [ ] "Exit guidance" saves preference to `user_profiles` and hides panel immediately
- [ ] Settings → Guided Mode toggle reads and writes the preference
- [ ] "Create a new AI-assisted post" workflow completes end-to-end on the Vercel preview (all 9 steps, all action detectors fire)
- [ ] `postStatusChange` and `streamComplete` detectors implemented and smoke-tested
- [ ] Off-script route change triggers amber "Looks like you went to…" message
- [ ] No regression in standard UI for users with `guided_mode_enabled = false`

### Phase 2 — Brainstorm + Develop + Schedule Workflows

**Estimated effort: 3–4 development days**

Acceptance criteria:
- [ ] "Brainstorm new ideas without developing" workflow completes end-to-end
- [ ] "Develop an existing idea" workflow completes end-to-end (only shown when `hasUnprocessedIdeas = true`)
- [ ] "Schedule an existing draft" workflow completes end-to-end (only shown when `hasUnpublishedDrafts = true`)
- [ ] `useUserState()` hook implemented; all four conditional options in the welcome prompt work correctly
- [ ] "What next?" menu after each workflow shows context-filtered options
- [ ] Welcome prompt on login shows correct options for the logged-in user's actual state

### Phase 3 — Setup Workflows (Voice Profile, LinkedIn)

**Estimated effort: 2–3 development days**

Acceptance criteria:
- [ ] "Set up my profile / voice" workflow completes end-to-end (only shown when `voiceProfileComplete = false`)
- [ ] "Connect LinkedIn" workflow completes end-to-end (only shown when `linkedInConnected = false`)
- [ ] Both setup workflows appear in the first-login welcome prompt for new accounts with incomplete profiles
- [ ] Existing Tutorial SDK tutorials do not fire simultaneously with Guided Mode (conflict suppression logic in place)
- [ ] Timeout help messages are wired for all workflow steps with `timeout > 0`
- [ ] Guided Mode rollout banner shown to existing accounts who have never seen the mode (dismissible, writes `guided_mode_enabled = true` if accepted)

### Phase 4 — Post-V1 Workflows + Polish

**Estimated effort: 4–6 development days (estimate only — scope TBD)**

Acceptance criteria:
- [ ] At least two post-V1 workflows from the deferred list implemented (recommended: "Edit / improve a previous post" + "Reschedule or unschedule a post")
- [ ] Tutorial SDK final-step handoff to Guided Mode ("Want a full walkthrough?") wired for the Idea Generator and Post Editor tutorials
- [ ] Workflow completion analytics event emitted to a logging sink (implementation details TBD; no dashboard in V1)
- [ ] Mobile assistant panel (bottom bar collapsed view) tested on iOS Safari and Android Chrome via Vercel preview
- [ ] `guided_workflows_dismissed` preference respected (workflow intro is skipped for dismissed workflows)

---

## 11. Open Questions for the Owner

These are pick-one or yes/no decisions that must be resolved before Phase 1 implementation can start. No implementation choice should be made for you here; these are genuinely your calls.

**Q1. Should the assistant panel be a persistent right-side column or a slide-out drawer?**
This doc recommends the persistent right-side panel (always visible, no click required to read the message). The trade-off: it permanently reduces the horizontal space available to the main content area by 320px on desktop. If you find that cramped in real use, a slide-out drawer triggered by a fixed "coach" chip in the corner is the alternative. Pick one before Phase 1 begins.

**Q2. Default ON for new accounts — confirmed?**
The spec says yes; this doc agrees. Confirming that you're comfortable with first-time users seeing Guided Mode immediately on their first post-signup session (no opt-in prompt). Alternative: show a "Would you like a guided walkthrough?" prompt on first login and let the user choose. Lean toward the spec's default-on but want your explicit sign-off.

**Q3. Should the welcome prompt fire on every login, or only when the user has been inactive for a defined period (e.g., 3+ days)?**
The spec says "every login." This is the simplest implementation. The counter-argument: a daily user who finishes their posting in 10 minutes doesn't need to dismiss the welcome prompt every single day — it could become noise. Recommend: show on every login for the first 30 days of account age; after 30 days, show only after 3+ days of inactivity. But this is your call.

**Q4. Should the "Just let me explore" option in the welcome prompt turn off Guided Mode permanently (writes to `user_profiles`) or only for the current session (in-memory)?**
Session-only is friendlier (the panel comes back tomorrow). Permanent means a motivated click, which is a stronger signal but requires the user to re-enable in Settings if they change their mind. Recommend: session-only, with a small "Don't show me this again" checkbox inside the option.

**Q5. Should workflow steps spotlight (dim + highlight) the relevant UI element like the Tutorial SDK does, or just describe it in text?**
The Tutorial SDK uses a spotlight overlay (`selector` field). Guided Mode could do the same. The trade-off: spotlight is more dramatic and harder to miss, but it requires the panel and the spotlight to coexist visually without confusing users about which one to look at. Text-only is simpler for V1. Recommendation: text-only for Phase 1, add optional spotlight for specific high-confusion steps in Phase 2.

**Q6. Is "Just let me explore" (session bypass) a tracked event, or truly invisible?**
If we never know how many users click "Just let me explore" at the welcome prompt, we can't tell whether Guided Mode is adding friction or being ignored. Even without an analytics dashboard in V1, emitting a simple anonymous event to PostHog / Vercel Analytics would let you see the ratio. Confirming you want that event even before a proper analytics workflow (Phase 4) exists.

**Q7. Should the Guided Mode panel appear on all pages within the app, or only on the pages where a workflow is active?**
If a workflow is active, the panel should always be visible. But what about when no workflow is running — should the panel show a "What would you like to do?" prompt on every page, or only on the dashboard / after completing a workflow? Recommend: panel is only visible when a workflow is active or the welcome prompt is being shown. No persistent "open" panel when the user is just browsing. This keeps the UI clean for users who've moved past the guided phase.

---

## 12. Risk Assessment

### Risk 1 — Off-script detection causes a false alarm on normal navigation

**Severity: Medium.** The engine watches for unexpected route changes. But PostPilot has legitimate multi-page sub-flows within a single workflow (e.g., Idea Bank → Post Editor is expected navigation inside "Create a new AI-assisted post"). If the engine treats every route change as "off-script," the panel fires an amber warning every few seconds — which would be worse than no Guided Mode at all.

**Mitigation:** Workflow steps that involve navigation must explicitly declare their expected routes in `waitForRoute` or as a sequence of allowed routes. The engine only fires an off-script alert if the user navigates to a route that is NOT in the current step's expected set. In practice, each `GuidedStep` can have an `allowedRoutes: string[]` field that suppresses the off-script alert for known transitions.

### Risk 2 — Guided Mode and Tutorial SDK tutorials clash visually

**Severity: Medium.** If both fire simultaneously, the user sees two overlapping coaching interfaces: a Tutorial SDK card (spotlight + card overlay) AND the Guided Mode panel. This is disorienting and unpolished.

**Mitigation:** The `GuidedModeProvider` must check Tutorial SDK engine state on every render and suppress the assistant panel while a tutorial is active. This requires a lightweight integration between the two systems — either a shared context or a simple `window.__TUTORIAL_ACTIVE` flag (the Tutorial SDK already uses `window.__TUTORIAL_DEBUG`, so a sibling flag is consistent). Define the suppression rule as a hard constraint in Phase 1 acceptance criteria.

### Risk 3 — Workflow definitions become stale as the product evolves

**Severity: Low-to-Medium.** Workflow steps reference `data-tour-id` selectors, route paths, and feature names. Every time a page is redesigned, a modal is renamed, or a route changes, at least one workflow step breaks silently — the action detector just never fires, and the user gets stuck on a step permanently.

**Mitigation:** Two practices: (1) Every `data-tour-id` attribute that a workflow depends on must be listed in a comment in the workflow file, so a developer who renames a component knows to update the workflow. (2) A lightweight CI check (a simple selector audit script) that verifies all `data-tour-id` values referenced in workflow definitions exist in the built HTML of at least one major page. This is a Phase 3 hardening task, not V1, but should be planned for.

---

## 13. Effort Estimate

| Phase | Scope | Estimate |
|---|---|---|
| Phase 1 | Engine + panel + canonical workflow | 6–8 days |
| Phase 2 | Brainstorm + Develop + Schedule workflows | 3–4 days |
| Phase 3 | Setup workflows + conflict suppression + rollout banner | 2–3 days |
| Phase 4 | Post-V1 workflows + mobile polish + analytics events | 4–6 days |
| **Total** | All four phases | **15–21 days** |

Phase 1 is the highest-risk phase because it establishes the architecture. Phases 2 and 3 are additive and should be faster once the engine pattern is proven. Phase 4 scope is explicitly variable — defer the exact post-V1 workflow selection to after Phase 3 ships.

**Recommended sequencing:** Phase 1 → owner review on Vercel preview → Phase 2 → Phase 3 → Phase 4. Do not start Phase 2 until Phase 1 has been signed off in production, because the workflow definitions are the primary maintenance surface and any architectural change made after Phase 2 ships would require updating multiple workflows.

---

## Anchor File References (for implementation phase)

| Purpose | File |
|---|---|
| Action detector (reuse directly) | `packages/tutorial-sdk/src/core/action-detector.ts` |
| Tutorial engine (reference pattern) | `packages/tutorial-sdk/src/core/engine.ts` |
| Tutorial types (extend for guided types) | `packages/tutorial-sdk/src/core/types.ts` |
| App shell layout (provider injection point) | `src/app/(app)/layout.tsx` |
| Post editor (AI Assistant stream endpoint) | `src/app/(app)/posts/[id]/page.tsx` |
| User profile table (schema migration target) | `user_profiles` (Supabase, confirmed post-BP-114) |
| Existing `data-tour-id` usage | Search codebase for `data-tour-id` to inventory existing anchors |
| Settings page (toggle placement) | `src/app/(app)/settings/` |
| Idea Bank page | `src/app/(app)/ideas/` |
