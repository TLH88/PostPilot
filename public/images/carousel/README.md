# Marketing carousel — runtime images

Files in this directory are served by Next.js at `/images/carousel/<file>`
and consumed by `<ScreenshotCarousel>` on the landing page
(`src/app/page.tsx`).

Required filenames (in display order):

1. `launch-pad.png`
2. `post-editor.png`
3. `calendar.png`
4. `analytics.png`

Originals / source-of-truth copies live in `docs/images/carousel/`. Keep
both in sync — the `docs/` copy is the archive, the `public/` copy is
what actually renders.

Recommended export: PNG, ~1600×1000 px (16:10). The carousel frame is
`aspect-[16/10]` with `object-cover`, so anything close to that ratio
will render without cropping.
