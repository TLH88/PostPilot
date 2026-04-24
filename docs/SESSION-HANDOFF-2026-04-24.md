# Session Handoff — 2026-04-24

Written at end-of-day so a fresh context window can pick up cleanly.

---

## TL;DR

**Subscription Model v2 shipped end-to-end on `develop` in a single day**, 14 commits. `main` is still at `82d8dad` (pre-v2). Every EPIC-1 item and every v2-adjacent item across EPICs 3 / 4 / 10 is Done. The v2 body of work is waiting on an owner-driven merge to `main`.

```
develop HEAD: 4b91590  (14 commits ahead of main)
main HEAD:    82d8dad  (pre-v2, waiting for merge decision)
```

No paying users, no production-facing regressions expected — v2 is strictly additive over the existing system and all existing test users (Tony, test@postpilot.dev, philipp, sandra) were verified well under the new quota caps before each migration.

---

## What shipped today (ordered by commit)

| Commit | BP(s) | Headline |
|--------|-------|----------|
| `d98a4d6` | BP-115/116/123/126 | v2 Sprint 1 — cost study memo, local-dev login route, pricing page display |
| `9f5ff24` | BP-117 Phase A | Data model + v2 quotas (image_generations column, SUBSCRIPTION_TIERS.limits migration, GATED_FEATURES updates) |
| `b89f8cd` | BP-117 Phase B | BYOK bypass in checkQuota/incrementQuota + structured 402 errors + usage card polish |
| `5575df9` | (fix) | 402 response returns display label, not internal tier key |
| `40a18bd` | BP-114 | Full rename: `creator` → `personal` tier, `creator_profiles` → `user_profiles`, `CreatorProfile` → `UserProfile`, UI copy |
| `ff4f07f` | BP-117 Phase C+D | Admin-editable system AI default (`/admin/system` + `/api/admin/system-ai-config`) + client-side 402 handler on 5 AI fetch sites |
| `ed202b7` | BP-118 | Tier-aware trial-expired messaging + inactive BYOK reassurance |
| `02c45c4` | (fix) | Lock card overflow — render inline when locked, not as overlay |
| `3312293` | (fix) | "Required on the Free and Personal plans" (both tiers, not just Personal) |
| `3b88baf` | (fix) | BYOK upsell copy — Pro/Team/Enterprise, generic "AI provider keys" |
| `367d6c8` | (fix) | max-w-md to avoid orphan word |
| `d6cb246` | BP-125 | Tier-gated BYOK resolution + image-capable provider check |
| `d1cce6c` | BP-119 P1 + BP-124 | Ad placement evaluation memo + credit pack spec (parallel-agent deliverables) |
| `4b91590` | BP-120/121/127/128 | Help content refresh + tutorial dismiss MVP + caching hint on AIRequestOptions |

---

## Migrations applied to production Supabase

All applied via MCP against project `rgzqhyniuzhqfxqrgsdd`:

1. `20260424_rename_creator_tier_to_personal.sql` — tier key flip in `subscription_tier`, `original_tier`, `trial_tier`, `last_trial_tiers` JSONB keys, plus CHECK constraint swap.
2. `20260424_rename_creator_profiles_to_user_profiles.sql` — `ALTER TABLE RENAME` + PK / FK / CHECK / trigger renames.
3. `20260424_add_image_generations_to_usage_quotas.sql` — new NOT NULL DEFAULT 0 column.
4. `20260424_system_ai_config.sql` — admin-editable singleton, seeded `openai/gpt-4.1-mini`.
5. `20260424_tutorial_dismissals.sql` — `tutorial_progress` + `tutorial_user_state` tables (never applied prior — SDK was falling back to localStorage) + `dismissed` / `dismissed_at` columns.

---

## Decisions committed this session (owner-confirmed)

1. **BYOK is Pro-tier-and-above only.** Free and Personal are system-keys-only regardless of configured keys. Trial users pass because `subscription_tier` is flipped to `professional` during the trial window.
2. **v2 quotas** — Free 3/2/20/2/0 · Personal 30/20/200/-1/30 · Pro 100/200/500/-1/200 · Team/Enterprise -1/-1/-1/-1/-1 (posts/brainstorms/chats/scheduled/images).
3. **Personal chat quota raised 150 → 200** during the cost-study approval cycle.
4. **Annual discount 15%** (was 17%). Annual prices: Personal $204, Pro $510, Team $1,020.
5. **Hard-stop on Pro quota exhaustion** — no overage billing. BYOK is the unlock path.
6. **Admin system default starts at `openai/gpt-4.1-mini`** per cost-study rec. Admin can flip to `claude-haiku-4-5-20251001` via `/admin/system` to unlock prefix caching for brainstorm (BP-128 pattern).
7. **Full Creator → Personal rename** (BP-114 extended) — across DB values, table name, TS type, UI. No more `creator` anywhere in new code.

---

## Deferred / known follow-ups (in priority order)

### Blockers for GTM
- **BP-015 Stripe billing.** Still the revenue-unlock BP. Pricing page displays prices but no checkout.
- **Merge develop → main.** Per the Safe Merge Workflow memory, next session should pull any main-only hotfixes into develop first before merging forward.

### v2 polish / follow-ups
- **BP-121 in-card checkbox.** The current MVP lets users dismiss from the Help page. An in-tutorial "Don't show this again" checkbox is the natural next step but requires SDK refactor of `TutorialCard` / `OverviewCard` / `SimpleCard` in `packages/tutorial-sdk/`.
- **BP-119 Phase 2 integration.** Memo at `docs/ad-strategy/2026-04-ad-placement-evaluation.md` has 8 owner decisions pending.
- **BP-124 build.** Spec at `docs/specs/credit-packs.md`. Held until post-GTM gates fire.
- **BP-128 measurement.** After owner switches admin system default to an Anthropic model, query `ai_usage_events` for brainstorm `SUM(cached_tokens) / SUM(input_tokens)` after ~1 week. Target >40% cache hit rate.

### Smaller cleanups
- **BP-120 follow-up.** `/help` page could use a dedicated "AI Image Generation" card — currently only referenced inside Publishing to LinkedIn.
- **BP-112** — `Button` `outline` variant footgun. Still Backlog.
- **Vercel env var cleanup** — `DEV_AUTO_LOGIN_TOKEN`, `DEV_AUTO_LOGIN_ALLOWED_EMAILS`, `NEXT_PUBLIC_DEV_LOGIN_EMAIL` from the removed `/api/dev/auto-login` should still be deleted from Vercel Preview env (noted in prior activity logs; verify).

---

## What a fresh session should read first

When a new context window picks this up:

1. **`.claude/.../memory/MEMORY.md`** — index is already updated.
2. **`.claude/.../memory/project_status.md`** — fully rewritten today with current state.
3. **`docs/ACTIVITY_LOG.md`** — today's Part 5 entry at the top summarizes BP-120/121/127/128 specifically; earlier Part entries cover the rest of the day.
4. **`docs/BACKLOG.md`** — every BP touched today has an updated Status line (Done / MVP Done / Spec Done) and a "Shipped:" section listing exactly what landed.
5. **`docs/cost-studies/2026-04-token-cost-study.md`** — still the authoritative input for any future pricing / model decisions.
6. **`docs/ad-strategy/2026-04-ad-placement-evaluation.md`** and **`docs/specs/credit-packs.md`** — the two memos produced by parallel agents late in the day.

---

## Working tree status at end-of-session

```
On branch develop
Your branch is up to date with 'origin/develop'.

Changes not staged for commit (pre-existing across sessions, do NOT commit):
  modified:   .claude/launch.json
  modified:   .claude/settings.local.json
  modified:   docs/images/tutorial-card-dark.png

Untracked (pre-existing):
  .claude/commands/
  docs/images/ScreenShots_Before/
  public/NPOS Favicon.png        ← still awaiting owner call
  supabase/.temp/
```

All intentional. Nothing left uncommitted from today's work.

---

## Ready to close the context window

Next session should have zero ambiguity about what's Done, what's waiting, and what to do first (most likely: plan the `develop → main` merge, or start BP-015 Stripe integration). All entry-point docs are up to date.
