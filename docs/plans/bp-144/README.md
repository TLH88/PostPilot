# BP-144 — Visual Design System (CLOSED — reference material only)

> **Status: Closed 2026-05-04.** Owner reviewed all three v3 finalists, cherry-picked features for incremental adoption into the current product, and decided no full visual-design-system rewrite will ship. The artifacts in this directory are preserved as **design reference material** going forward.
>
> Pull-forward features (specific elements / patterns the owner wants to harvest from these designs) will be filed as separate BPs as they're scoped. Do not treat this directory as a backlog of pending work.

## What's in here

- `v3-round-2-reviews/` — round-2 cross-reviews from the three design agents
- `v3-round-3-finalists/agent-a/` — finalist concept A (`index.html`)
- `v3-round-3-finalists/agent-b/` — finalist concept B (`index.html`, `app.html`)
- `v3-round-3-finalists/agent-c/` — finalist concept C (`index.html`, `app.html`)

Open the HTML files locally in a browser to see each finalist's design language. They are static mockups, not connected to live data.

## How to use these going forward

When the owner files a new BP that says "pull this pattern from BP-144 finalist X":

1. Open the relevant `index.html` / `app.html` in a browser to see the pattern in context.
2. Extract the specific element / interaction / color / type pattern called out in the new BP.
3. Adapt it to the current production code; the mockups are not pixel-exact requirements.
4. Cite the source mockup in the new BP's commit message so traceability holds.

## Why BP-144 closed without shipping a full system

A full visual-design-system rewrite would have meant:
- Re-skinning every page in the app
- Reconciling the new design language with the existing CSS variable structure
- Multiple weeks of pre-GTM sprint capacity

That doesn't move the Free→Pro conversion needle and would have delayed GTM. Owner instead chose to harvest individual proven elements over time, in small additive BPs that can ship alongside other work without a coordinated rewrite. See the post-GTM deferral standing rule (`docs/plans/POST-GTM-FUTURE-FEATURES.md`) for the broader principle this aligns with.

## Branch hygiene

The `bp-144-visual-design-system` branch carried earlier rounds of design exploration. After this README and the v3 finalists land on `develop`, that branch can be deleted (its content is preserved here on `develop`). See the 2026-05-04 branch audit (run mid-session) for the full cleanup recommendations.
