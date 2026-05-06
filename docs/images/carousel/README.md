# Marketing carousel — source-of-truth images

Originals for the landing-page screenshot carousel
(`<ScreenshotCarousel>` in `src/components/landing/screenshot-carousel.tsx`).

Required filenames (in display order):

1. `launch-pad.png`
2. `post-editor.png`
3. `calendar.png`
4. `analytics.png`

Runtime serving copies live in `public/images/carousel/` — Next.js can
only serve static files from `public/`, not from `docs/`. Whenever you
update an original here, copy it across to `public/images/carousel/`
with the same filename.

Recommended export: PNG, ~1600×1000 px (16:10). The carousel frame is
`aspect-[16/10]` with `object-cover`, so anything close to that ratio
will render without cropping.
