# PostPilot — 48-Hour System Review

> **Generated:** 2026-04-16
> **Scope:** All commits, code changes, and pushes to `develop` branch in the last 48 hours
> **Method:** Three parallel review teams (Code, UI/UX, System Logic) → Lead synthesis with verification
> **Output:** This report + new BP-088 through BP-097 added to BACKLOG.md (tagged `[2026-04-16 Review]`)

---

## Executive Summary

The team shipped **massive scope** in 48 hours: 11 commits, ~5,000+ net lines of code, completing 8 backlog items (BP-023, BP-025, BP-046–051, BP-086, BP-087) and one major Tutorial SDK Phase 1. Backlog progress moved from 37/67 (55%) → 45/67 (67%).

**The good:** Security fundamentals are strong. RLS recursion fix uses proper `SECURITY DEFINER` pattern. Workspace scoping is comprehensive across all read paths. Activity-logging throttle (10 min/session) is correctly implemented at the call site. Tier gating via `hasFeature()` is consistent.

**The concerning:** Three real bugs ship to users today:
1. **DELETE `/api/posts/assign` skips authorization** — any authenticated user can unassign any post by ID.
2. **Approval decision logic is dead-code** — `decision === "approved" ? "draft" : "draft"` means approved posts never advance status; they get stuck in `draft` with `approval_status="approved"` and no clear "ready to publish" state.
3. **`window.location.reload()` in two places** in the post editor wipes user state (panel preference, chat, scroll position) on every approval action.

**The strategic risk:** ~3,000 lines of Team-tier collaboration shipped before Stripe billing exists. The Team tier ($99/mo + $5.99/seat) cannot accept payment yet. Per memory, BP-015 (Stripe billing) is the revenue blocker — and the surface area we're maintaining keeps growing.

---

## Findings — Verified, Prioritized

Severity = **Critical** (security, data loss, blocks core workflow) > **High** (broken behavior, dead UI) > **Medium** (maintainability, polish) > **Low** (nits).

Each finding includes verification status: ✅ verified by reading code, ⚠️ partially verified, 🔵 strategic/judgment call.

### CRITICAL

#### C1. DELETE `/api/posts/assign` has no authorization check ✅
**File:** [src/app/api/posts/assign/route.ts:88-124](src/app/api/posts/assign/route.ts:88)
**Source:** Code Review team
**Impact:** Any authenticated user (even from a different workspace, or a Free user with no workspace) can unassign any post if they know its UUID. The POST handler correctly checks workspace membership at [lines 33-44](src/app/api/posts/assign/route.ts:33), but the DELETE handler skips that check entirely.
**Fix:** Mirror the POST handler's workspace membership check before the update at line 100. See BP-088.

#### C2. Approval decision logic — approved posts never advance status ✅
**File:** [src/app/api/posts/approval/route.ts:144-150](src/app/api/posts/approval/route.ts:144)
**Source:** Code Review team
**Impact:** `const newStatus = decision === "approved" ? "draft" : "draft";` (line 144) — both branches are identical. Approved posts end up with `status="draft"` and `approval_status="approved"` but no path forward. The editor sees "approved" but the post is still a draft. There is no `"ready"` status transition. Users will be confused: "It's approved, now what?"
**Fix:** Define a `"ready"` (or `"approved"`) post status, route approved posts there, then surface a "Schedule" or "Publish Now" button in the editor. See BP-089.

#### C3. PATCH `/api/posts/comments` has no role/author check (RLS-only defense) ✅
**File:** [src/app/api/posts/comments/route.ts:131-158](src/app/api/posts/comments/route.ts:131)
**Source:** Code Review team
**Impact:** The handler updates `resolved`, `resolved_by`, `resolved_at` on a comment by ID with no check that the caller authored the comment OR is workspace owner/admin. RLS may catch this (the migration policy allows only owner/admin/author), but defense-in-depth is missing. If RLS is misconfigured later, this becomes an auth bypass.
**Fix:** Add explicit role/authorship check before the update. See BP-088 (rolled in with C1 as "audit all team-feature API routes for missing auth").

#### C4. `window.location.reload()` in post editor wipes user state ✅
**Files:** [src/app/(app)/posts/[id]/page.tsx:1520](src/app/(app)/posts/[id]/page.tsx:1520) (ApprovalControls onChange) and [:2276](src/app/(app)/posts/[id]/page.tsx:2276) (SubmitForReviewDialog onSubmitted)
**Source:** UI/UX Review team
**Impact:** Every approval action (submit / approve / request-changes) does a full page reload. This wipes:
- Tabbed panel preference (gets reset to last value from localStorage but flickers)
- AI chat conversation in the right panel
- Scroll position
- Any in-progress edits that haven't auto-saved yet (10-second debounce)

It also causes a visible flash. Especially bad because reviewers will be doing this repeatedly.
**Fix:** Replace reloads with local state refetch (`router.refresh()` or re-query the post). See BP-090.

---

### HIGH

#### H1. ApprovalControls has no visible mount in the new tabbed panel ✅
**File:** [src/app/(app)/posts/[id]/page.tsx](src/app/(app)/posts/[id]/page.tsx) (the 562fa0a redesign)
**Source:** UI/UX Review team
**Impact:** The 562fa0a refactor moved Comments and Activity into the right panel as tabs. ApprovalControls was *intended* to stay inline (above the tabs) per the commit message, and `onChange` is wired to it at line 1520. But there's no fourth tab for "Approvals" and no obvious place where reviewers see/act on pending approvals from the editor. The only UI exposure is the `/workspace/reviews` page.
**Fix:** Either add Approvals as a fourth tab, OR ensure the inline ApprovalControls card is visibly rendered for workspace posts. Verify with a manual walkthrough. See BP-091.

#### H2. "No eligible reviewers" dialog is a dead end ⚠️
**File:** [src/components/posts/submit-for-review-dialog.tsx](src/components/posts/submit-for-review-dialog.tsx)
**Source:** UI/UX Review team
**Impact:** When no other workspace member has owner/admin/editor role (the *exact* scenario that triggered the 97ec2a0 fix today), the dialog tells the user "No eligible reviewers found" and offers only Cancel. No deep-link to Members page; no inline "promote a member" action.
**Fix:** Add a "Manage Members" button in the empty state that opens `/workspace/members`. See BP-091.

#### H3. LinkedIn analytics UI ships without a working backend (LinkedIn approval pending) 🔵
**Files:** [src/app/(app)/posts/[id]/published/page.tsx](src/app/(app)/posts/[id]/published/page.tsx), [src/components/posts/refresh-analytics-button.tsx](src/components/posts/refresh-analytics-button.tsx)
**Source:** System Logic + UI/UX teams (consensus)
**Impact:** BP-025 is explicitly blocked on LinkedIn app approval for the `r_member_postAnalytics` scope. The analytics UI is shipped anyway: a "Refresh from LinkedIn" button exists, but it'll fail for every user until the scope is approved. Users will think the feature is broken (we'll get support tickets) instead of pending.
**Fix:** Hide or "Coming Soon" the Refresh button until scope is granted. Show a clear "Manual entry" mode label. See BP-092.

#### H4. Notifications don't deep-link to context ✅
**File:** [src/app/api/posts/comments/route.ts:99,118](src/app/api/posts/comments/route.ts:99) and [src/app/api/posts/approval/route.ts:118,177](src/app/api/posts/approval/route.ts:118)
**Source:** UI/UX Review team
**Impact:** All notifications use `action_url: "/posts/${postId}"`. Clicking a "you were mentioned" notification takes you to the post editor's last-used tab — which might be AI Assistant, not Comments. You then have to find the comment manually.
**Fix:** Append `?panel=comments#comment-${id}` for mention/comment notifications, `?panel=activity` for approval decisions. Have the post editor honor the `?panel=` query on mount. See BP-093.

#### H5. No route-level tier gating for `/workspace/*` and `/notifications` 🔵
**Source:** System Logic team
**Impact:** Free/Creator/Pro users can navigate by URL to `/workspace/reviews`, `/workspace/members`, `/notifications`, `/activity` and see broken/empty pages. Component-level gating exists; route-level redirect doesn't.
**Fix:** Add middleware or layout-level redirect: if `!hasFeature(tier, "workspaces")` and pathname starts with `/workspace/`, redirect to `/pricing`. See BP-094.

---

### MEDIUM

#### M1. Activity logging silently swallows all errors ✅
**File:** [src/lib/activity.ts:41-43](src/lib/activity.ts:41)
**Impact:** `catch {}` — no console.error, no telemetry. If the activity_log RLS policy breaks tomorrow, no one will know until users complain about a missing feed. Same pattern in `notifications.ts`.
**Fix:** Log to `console.error` at minimum; long-term, route to logApiError. Rolled into BP-095.

#### M2. `applyWorkspaceFilter` not used uniformly across all paths 🔵
**Source:** Code Review team
**Impact:** Some paths use the helper, others manually filter on `workspace_id`. Risk of drift — a future write path could miss the workspace_id and silently leak data across tenants.
**Fix:** Audit all server-side `posts`/`ideas`/`activity_log` queries for consistent use of the helper. Add an ESLint rule or comment. Rolled into BP-095.

#### M3. Reviewer role model is invisible to users 🔵
**Source:** System Logic + UI/UX teams
**Impact:** The role hierarchy (owner > admin > editor > member > viewer) and "only owner/admin/editor can review" rule is enforced in code but not explained to users. The only hint is the new "Can review" badge on the Members page, which only appears for those who already have the role. New users will be confused.
**Fix:** Add a "Roles & Permissions" help card on the Members page (collapsible). Update Settings → Help to include this. Rolled into BP-091.

#### M4. Workspace context indicator missing from top bar ✅
**Source:** UI/UX team
**Impact:** Once a Team user is in a workspace, no persistent visual indicator shows *which* workspace they're in (it's only in the sidebar workspace switcher, which can be collapsed). Easy to lose context, especially mid-edit.
**Fix:** Add workspace name pill to top bar when an active workspace is set. See BP-093.

#### M5. Approval workflow has no deadline / escalation 🔵
**Source:** System Logic team
**Impact:** A submitted post can sit in "review" forever. No reminder to reviewer, no deadline, no auto-escalation. For Team-tier customers, this will hurt adoption.
**Fix:** Document as deferred to Phase T4 in ROADMAP. Add a short-term mitigation: a daily reminder notification to pending reviewers. See BP-096.

#### M6. Tutorial SDK has no workspace-context awareness 🔵
**Source:** System Logic team
**Impact:** All 8 shipped tutorials target absolute routes. The `/dashboard` tutorial assumes individual mode — but a Team user in workspace mode sees a very different dashboard (assignment cards, activity feed, etc.). Tutorial step targets may not exist or may be wrong.
**Fix:** Audit tutorial step selectors against both modes; add a "tutorial works in: individual / workspace / both" tag in the tutorial definitions. Rolled into Tutorial SDK Phase 2 (existing backlog).

---

### LOW / Nits

- **L1.** [src/app/api/workspace/invite/route.ts](src/app/api/workspace/invite/route.ts) uses `admin.listUsers()` to look up an invitee by email. Works fine for current scale, but O(n) on every invite. Consider a direct `select` once user count grows.
- **L2.** Hardcoded `["owner","admin","editor","member","viewer"]` validation in multiple places — extract to `src/lib/constants.ts`.
- **L3.** `MS_PER_DAY = 86400000` magic number in trial/start route — extract.
- **L4.** Empty-state copy varies across pages ("No posts yet" vs "No items to show"). Minor consistency polish.
- **L5.** `ActivityAction` type includes `member_joined` / `member_left` — never logged. Add a `// reserved for future use` comment or remove.

---

### Findings That Were RAISED but DOWNGRADED After Verification

These were called out by review teams but were either incorrect or overstated. Documenting so we don't act on them.

- **"post_edited has no throttle implementation"** (System Logic team) — **WRONG.** Throttle exists at the call site in [src/app/(app)/posts/[id]/page.tsx:450-484](src/app/(app)/posts/[id]/page.tsx:450) using `useRef` + 10-min compare. Code is correct.
- **"Trial cooldown stored as timestamp, broken comparison"** (Code Review team) — **OVERSTATED.** The math `Math.floor((Date.now() - new Date(lastTrialDate).getTime()) / 86400000)` works correctly. Storage as ISO string is fine. Cooldown logic is functioning.
- **"DELETE `/api/posts/comments` missing auth"** — **WRONG.** Line 170 uses `.eq("id", id).eq("user_id", user.id)` — only the author can delete. OK.

---

## Strategic Observations

### S1. Billing must be next. Period.
Per memory, BP-015 (Stripe billing) is the revenue blocker. We just shipped ~3,000 lines of Team-tier features. Team-tier customers cannot pay us. Every feature shipped without billing = more code to maintain at quality with zero revenue offset.

**Recommendation:** Freeze new feature work after the corrective actions in this report. Stripe integration becomes the next sprint.

### S2. Surface area vs maintainability
The codebase is now genuinely large for the team size. Recent commits each introduced ~5–20 new files. The next code review cycle (in 7-14 days) should include a complexity audit: are we adding helpers fast enough to keep the code organized, or are we accreting complexity?

### S3. LinkedIn analytics — ship UI behind a flag
Pattern to adopt: when an external dependency is pending (LinkedIn app approval, vendor approvals, etc.), don't ship the user-visible UI. Stage it behind a feature flag and turn on when the dependency lands. Saves support tickets and credibility.

---

## Improvement Opportunities (Top 5)

These are *new* opportunities surfaced by the review — distinct from the corrective actions above. Each has a priority and a rough level-of-effort.

| # | Opportunity | Priority | LOE | Why |
|---|---|---|---|---|
| **I1** | **Stripe billing integration (BP-015)** | P0 — revenue blocker | XL (1-2 weeks) | Team tier exists but cannot bill. Every day without billing is a day of unmonetized infrastructure cost. Per ROADMAP Phase 1, this is *the* gate to revenue. |
| **I2** | **Approval workflow polish: status transitions + auto-publish option** | P1 | M (2-3 days) | After fixing C2 (the dead-code bug), invest a small amount more to make the post-approval workflow great: optional auto-schedule on approval, "ready" status badge, clear next-action button. Differentiates Team tier. |
| **I3** | **Notification preferences + email delivery** | P1 | L (4-6 days) | Schema already has `email_enabled`, `email_queued_at`, `email_sent_at` (per fd913e5). Activate it. Pair with a Settings → Notifications page with per-type toggles. Critical for Team-tier adoption — users won't tolerate in-app-only for assignments. |
| **I4** | **End-to-end QA pass on collaboration suite (manual or scripted)** | P1 | M (1-2 days) | The team suite is 6 features (BP-046 through BP-051) interacting with workspace scoping, RLS, tier gating, and notifications. There is no automated test coverage for the full happy path. A scripted Playwright run that covers: invite member → assign → comment → mention → submit for review → approve → schedule → publish would catch regressions before users do. |
| **I5** | **Activity feed observability (logs + retention policy)** | P2 | S (1 day) | M1 above flags the silent-failure pattern in activity logging. Pair the fix with a retention policy decision (90 days? 1 year?) and a small admin dashboard widget showing activity-log volume per workspace. Cheap to add now; expensive to retrofit when storage bills surprise us. |

**Total LOE for I1-I5:** ~3-4 weeks of focused work.

---

## Proposed Plan

### Sprint 1 — Stop the bleeding (1-2 days)
Address all CRITICAL findings immediately. Tag commits with `[review-2026-04-16]`.
- **BP-088** Auth audit (C1, C3) — DELETE assign + comments PATCH role check
- **BP-089** Approval status transitions (C2) — define `"ready"` status, fix dead-code branch
- **BP-090** Replace `window.location.reload()` (C4)
- **BP-092** Hide LinkedIn analytics UI behind scope check (H3)

### Sprint 2 — Polish team collaboration (3-5 days)
Address remaining HIGH and key MEDIUM findings.
- **BP-091** ApprovalControls visible mount + reviewer empty-state CTA + role help (H1, H2, M3)
- **BP-093** Notification deep-links + workspace badge (H4, M4)
- **BP-094** Route-level tier gating (H5)
- **BP-095** Audit silent failures + workspace filter usage (M1, M2)

### Sprint 3 — Strategic (2-3 weeks)
- **BP-015** Stripe billing (I1)
- **I3** Email delivery for notifications
- **I4** Playwright E2E for collaboration suite

### Deferred
- Approval deadlines/escalation (BP-096) → batch with Phase T4
- Tutorial workspace-awareness → batch with Tutorial SDK Phase 2

---

## Backlog Items Added by This Review

Tagged in BACKLOG.md under each item's Source field as `[2026-04-16 Review]` for easy filtering.

- **BP-088** — Authorization audit on team-feature API routes (Critical)
- **BP-089** — Approval workflow status transitions (Critical)
- **BP-090** — Eliminate `window.location.reload()` from post editor (Critical)
- **BP-091** — Approval UX: visible controls + empty-state CTAs + role help
- **BP-092** — LinkedIn analytics: gate UI on scope grant
- **BP-093** — Notification deep-links + workspace context indicator
- **BP-094** — Route-level tier gating for workspace and notification routes
- **BP-095** — Observability: kill silent failures + workspace filter audit
- **BP-096** — Approval deadlines + reviewer reminders (deferred to Phase T4)
- **BP-097** — Playwright E2E for team collaboration happy path

---

## How To Use This Report

1. **Today:** Review CRITICAL findings (C1–C4). These are user-impacting bugs in code that just shipped.
2. **This week:** Schedule Sprint 1 (BP-088, BP-089, BP-090, BP-092). Each is small enough to land in a single PR.
3. **Decision needed from you:** Should we defer Sprint 2 (BP-091, 093, 094, 095) to start Stripe billing immediately, or run them in parallel?
4. **Next review:** Re-run this 3-team review process after Sprint 1 lands to verify fixes and catch new issues.

---

*Report generated by lead synthesis agent after parallel reviews from Code Review, UI/UX Review, and System Logic teams. All CRITICAL findings verified by direct code inspection.*
