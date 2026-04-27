# BP-138 / UF-004 — UX Recommendation: Edit & Republish to LinkedIn

> Author: UX agent (general-purpose), 2026-04-26
> Source feedback: [USER_FEEDBACK.md UF-004](../USER_FEEDBACK.md)
> Backlog: [BACKLOG.md BP-138](../BACKLOG.md)
>
> **Status:** Awaiting owner direction on duplicate-prevention model + copy approval.
>
> **Note 2026-04-26:** The agent's report flagged that `src/app/(app)/posts/[id]/published/page.tsx` may not exist. **It does exist** — the agent's Glob hit a parens-in-path issue with the `(app)` route group. The published view is real and is where the new "Edit & republish" CTA will live. The rest of the recommendation stands.

---

## 1. Walkthrough of the current "after publish" experience

The trail goes cold almost immediately.

**What the user sees today (steps 3+ of the owner's flow):**
- The user clicks "Publish to LinkedIn" from the editor. Status flips to `posted`, `posted_at` and `linkedin_post_id` get stamped (`route.ts:205-207`).
- They reload or revisit `/posts/[id]` — the editor redirects them to `/posts/[id]/published` (`page.tsx:315-318`).
- **The published view (`src/app/(app)/posts/[id]/published/page.tsx`) exists** — it's where the "Edit & republish" CTA will land. The agent's original report missed this due to a Glob escaping issue with the `(app)` route group; the route is real.
- The "Revert to Draft" affordance exists (`page.tsx:1937-1942`) but is buried inside the editor's Actions dropdown, which the user can't reach without knowing the undocumented `?edit=true` query param.
- The amber edit-warning banner (`page.tsx:1456-1467`) is sensible but only fires *after* the user has somehow gotten themselves into the editor for a posted post — it doesn't help discovery.

**Net:** a non-technical creator who notices a typo on LinkedIn currently has no in-app path. They go to LinkedIn, delete the post manually, then come back and… find no obvious "let me edit this and try again" button. They either start a brand new post (losing all attribution/analytics history) or give up.

---

## 2. Mapped UX for each option

### Option A — Trust the user (warn + checkbox)

**Screens the user sees:**
1. Published view shows a secondary "Edit & republish" button next to "View on LinkedIn".
2. Clicking it opens a confirmation dialog: "The version on LinkedIn won't change automatically. Delete it on LinkedIn first, then come back here." Checkbox: "I've deleted the original post on LinkedIn." Primary button enables only after checkbox.
3. Editor opens with an amber banner: "Republishing — your edits will create a fresh LinkedIn post when you click Publish."
4. User edits, clicks Publish, sees success toast.

**Friction:** Low. One extra dialog, one checkbox.
**Drop-off risk:** Low — the path is linear and the user is already motivated (they want to fix something).
**Failure mode:** A user who lies/mis-clicks the checkbox creates a duplicate on LinkedIn. Recoverable (they delete one), embarrassing but not destructive.

### Option B — Programmatic check (poll LinkedIn API)

**Screens the user sees:**
1. Same CTA on published view.
2. Click → modal "Checking that the LinkedIn post is gone…" with a spinner.
3. If still live: "We can still see your post on LinkedIn. Please delete it there first, then click Re-check." Loop until pass.
4. If gone: editor opens, same banner as A.

**Friction:** High. The user is forced into a polling loop with a third-party they just left. LinkedIn API caches and propagation delays mean a deleted post can still appear "live" to the API for up to several minutes — the user hits "Re-check" two or three times wondering if they did something wrong.
**Drop-off risk:** Moderate-to-high. Every additional retry is a moment to abandon.
**Failure modes:** LinkedIn API rate limits, expired tokens, transient errors all turn the recovery flow into a support ticket. We are *blocking* a creator from editing their own content because of an API timing question. This is a self-inflicted wound.
**Trust signal:** Looks "smart" but feels paternalistic.

### Option C — New record per republish (versioned history)

**Screens the user sees:**
1. CTA on published view: "Create a new version".
2. Click → editor opens on a *new* post (new ID, new URL), pre-filled with the original's content, with a header chip "Based on [original title] · v2".
3. Old post becomes immutable archive. Sidebar/list shows a "v1, v2" stack.

**Friction:** Conceptually high for a non-technical user. They didn't ask for "versions" — they asked to fix a typo. Now they have two records in their post list and have to mentally track which is canonical.
**Drop-off risk:** Confusion, not abandonment — they'll publish, but they'll be confused about what happened to "their post."
**Implementation cost:** Highest of the three. New schema fields (`parent_post_id`), list-view grouping logic, archive UI, analytics roll-up across versions, decisions about which "version" the dashboard should count.
**Trust signal:** Strong audit trail, but the audit trail is for *us*, not for the creator.

---

## 3. Recommendation: Option A (Trust the user, with a clear checkbox)

**Pick A.** Here's why, against the rubric:

- **(a) Cognitive load:** Lowest. One dialog, one checkbox, one editor session. Maps 1:1 to the mental model "I'm editing this post and re-publishing."
- **(b) Reversibility / safety:** A duplicate LinkedIn post is *not catastrophic*. The creator can delete the extra one in 10 seconds. We're not protecting against irreversible data loss — we're protecting against a mild embarrassment. That doesn't justify B's friction or C's complexity.
- **(c) Trust signals:** Treating the user as competent is itself a trust signal. The checkbox is a soft handshake — "we trust you, just confirm." B says "we don't trust you." C says "we'll quietly fork your work behind your back."
- **(d) Effort vs gain:** A is mostly UI surface + a button on a published view that needs to exist anyway. No new schema, no new API integration. B requires LinkedIn URN-lookup logic, polling, error handling. C requires a versioning data model.
- **(e) Failure modes:** A's worst case is a duplicate — the user sees both, deletes one, moves on. B's worst case is being locked out of editing your own post because LinkedIn's API is laggy. C's worst case is permanent confusion about which post is "real" and split analytics.

The owner's instinct in step 4 of his flow ("User deletes the post from LinkedIn manually") already acknowledges A's model. We just need to make that step legible and unmissable inside our app.

---

## 4. Specific UI design for Option A

### Entry point on the published view

The `/posts/[id]/published` route needs to be built or surfaced. On it, beside the existing "View on LinkedIn" link, add a secondary button:

- **Label:** `Edit & republish`
- **Icon:** pencil + refresh (lucide `RefreshCw` or `PencilLine`)
- **Visual weight:** secondary/outline button, equal weight to "View on LinkedIn." Not primary — we don't want to nudge users toward republishing when they don't need to.
- **Placement:** top-right action cluster of the published view, next to "View on LinkedIn" and the Actions dropdown.

Also surface a tertiary text link below the post body: *"Need to fix something? Edit & republish."* — for users who scroll past the header without noticing buttons.

### Confirmation dialog

```
Headline:  Edit and republish to LinkedIn?

Body:      Your current LinkedIn post won't change automatically. To avoid
           having two versions live at once, delete it on LinkedIn first,
           then come back here to publish your edits.

           Open LinkedIn post →   (link, opens new tab)

Checkbox:  I've deleted the original post on LinkedIn.

Buttons:   [Cancel]   [Continue editing]   ← primary, disabled until checkbox
```

The "Open LinkedIn post" link is critical — it removes the only friction step (hunting for the post on LinkedIn).

### Editor experience while republishing

When the user enters edit mode via this flow, set a session flag (`?republish=true` query param, or local state). The existing amber banner copy at `page.tsx:1456-1467` should change to:

> **Republishing this post.** Your edits will publish as a brand-new post on LinkedIn. The original LinkedIn post will not be updated — make sure you've deleted it there.

Primary button copy:
- `Save draft` (secondary) — saves edits without publishing, leaves status as `draft` (covers the edge case in §5 below).
- `Publish to LinkedIn` (primary) — same wording as a normal publish; consistency matters more than calling out "republish" again on the button itself.

Hide the "Revert to Draft" item from the Actions dropdown in this state — they're already in the editable state.

### After successful republish

- Toast: `Republished to LinkedIn. Your post is live again.`
- URL: redirect to `/posts/[id]/published` (same record).
- The published view now shows the updated content, refreshed `posted_at`, and the new `linkedin_post_id` — visually identical to a first publish, because semantically it *is* the canonical live post now.

### After a failed republish

- Toast: `Couldn't republish to LinkedIn. Your edits are saved as a draft — try again when you're ready.`
- Status reverts to `draft` (it was already `draft` while editing).
- Persistent inline alert at the top of the editor: *"Last republish attempt failed: [error]. [Retry]"*
- Critical: do **not** auto-redirect away. The user is in a recovery state and needs to stay where they are.

---

## 5. Edge cases

**User republishes without deleting the original.** Two live posts on LinkedIn. The dialog copy is unambiguous about ownership ("delete it on LinkedIn first"). PostPilot's DB now points to the new URN; the old URN is orphaned. Analytics for the old post are lost from our side, but they were always going to be once the user deleted on LinkedIn. **Acceptable.**

**LinkedIn API fails on republish.** User has *already* deleted the original on LinkedIn (per the checkbox). Their status is `draft`, no live post exists. The retry path above handles this — the alert is sticky, the draft is saved, retry is one click. The toast copy explicitly says "saved as a draft" so they know they haven't lost work.

**Original was a scheduled post that auto-published.** Same flow. The `posted` status is the same regardless of how it got there; nothing in the republish UX should distinguish.

**User wants to unpublish *without* republishing immediately.** Yes, this should fit the same flow. After the confirmation dialog, the editor offers `Save draft` as a secondary action. They can edit (or not edit), save, and leave. Status is `draft`, they come back later, the normal "Publish to LinkedIn" button works. **No second flow needed.** This also doubles as a "I just want to take this down from my post list state" path.

A separate, smaller affordance is also worth adding: in the published-view Actions dropdown, a `Move back to draft` item with the same confirmation dialog (minus the "edits" framing). Same destination, different phrasing for users whose intent is "take it down" rather than "fix it."

---

## 6. Recommended copy library

| Element | Copy |
|---|---|
| Published-view CTA button | `Edit & republish` |
| Published-view Actions menu (alt path) | `Move back to draft` |
| Dialog headline | `Edit and republish to LinkedIn?` |
| Dialog body | `Your current LinkedIn post won't change automatically. To avoid having two versions live at once, delete it on LinkedIn first, then come back here to publish your edits.` |
| Open LinkedIn link inside dialog | `Open LinkedIn post →` |
| Dialog checkbox | `I've deleted the original post on LinkedIn.` |
| Primary action button | `Continue editing` |
| Cancel button | `Cancel` |
| In-editor banner during republish | `Republishing this post. Your edits will publish as a brand-new post on LinkedIn. The original LinkedIn post will not be updated — make sure you've deleted it there.` |
| In-editor primary publish button | `Publish to LinkedIn` |
| In-editor secondary | `Save draft` |
| Success toast | `Republished to LinkedIn. Your post is live again.` |
| Failure toast | `Couldn't republish to LinkedIn. Your edits are saved as a draft — try again when you're ready.` |
| Sticky failure alert | `Last republish attempt failed: {error}. [Retry]` |

---

## ⚠ Owner actions before BP-138 implementation can begin

1. **Confirm Option A vs B vs C** as the duplicate-prevention model. Recommendation: **A**.
2. **Approve the copy library** in §6, or send edits.

(The published-view route question raised in the original report is resolved — see note at top.)
