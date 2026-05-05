"use client";

/**
 * Screenshot carousel for the marketing landing page.
 * Auto-rotates every `intervalMs` (default 5s), pauses on hover/focus,
 * respects prefers-reduced-motion, and exposes manual controls (arrows
 * + dot indicators).
 *
 * Sizing is preset-based via the `size` prop. Pick the named bucket that
 * matches the section width, or pass your own `className` to override.
 *
 * Hover zoom: when `enableHoverZoom` is on (default), a circular lens
 * follows the cursor and shows the underlying screenshot zoomed in. Use
 * `lensSize` (px diameter) and `zoom` (multiplier) to tune.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselSlide {
  src: string;
  alt: string;
  caption: string;
}

// Tailwind max-width buckets keyed for easy size swaps. Add more if you
// need finer control — these correspond to standard tailwind tokens.
const SIZE_CLASSES = {
  sm: "max-w-2xl",   // ~672px
  md: "max-w-3xl",   // ~768px
  lg: "max-w-4xl",   // ~896px
  xl: "max-w-5xl",   // ~1024px (default)
  "2xl": "max-w-6xl", // ~1152px
} as const;

export type CarouselSize = keyof typeof SIZE_CLASSES;

interface ScreenshotCarouselProps {
  slides: CarouselSlide[];
  /** Preset width bucket. Default `xl` (max-w-5xl). */
  size?: CarouselSize;
  /** Auto-rotate interval. Default 5000 ms. Pass 0 to disable auto-rotate. */
  intervalMs?: number;
  /** Override classes — useful for custom max-width or margin tweaks. */
  className?: string;
  /** Show a magnifier lens that follows the cursor. Default true. */
  enableHoverZoom?: boolean;
  /** Diameter of the lens in pixels. Default 450. */
  lensSize?: number;
  /** Zoom multiplier inside the lens. Default 2.5x. */
  zoom?: number;
  /**
   * Visual mode:
   *   "card" (default) — framed gallery with arrows, dots, caption, lens.
   *   "bleed"          — chromeless full-size rotator suitable for hero
   *                      backgrounds; mounts as `absolute inset-0` so the
   *                      parent must be `relative` (or `isolate`).
   *                      Skips controls, lens, hover pause, and crossfades
   *                      slowly so it reads as ambient motion.
   */
  presentation?: "card" | "bleed";
}

export function ScreenshotCarousel({
  slides,
  size = "xl",
  intervalMs = 5000,
  className,
  enableHoverZoom = true,
  lensSize = 450,
  zoom = 2.5,
  presentation = "card",
}: ScreenshotCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lensPos, setLensPos] = useState<{ x: number; y: number } | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const frameRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  const next = useCallback(() => setActive((i) => (i + 1) % total), [total]);
  const prev = useCallback(
    () => setActive((i) => (i - 1 + total) % total),
    [total],
  );

  useEffect(() => {
    if (paused || total <= 1 || intervalMs <= 0) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(next, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, next, intervalMs, total]);

  // Track the rendered frame size so the lens can compute the zoomed
  // background-image position correctly even after viewport resize.
  useEffect(() => {
    if (!enableHoverZoom) return;
    const node = frameRef.current;
    if (!node) return;
    const update = () => {
      setFrameSize({ w: node.clientWidth, h: node.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [enableHoverZoom]);

  function handleLensMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!enableHoverZoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setLensPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  function handleLensLeave() {
    setLensPos(null);
  }

  if (total === 0) return null;
  const slide = slides[active];

  // Bleed mode: chromeless full-size rotator for hero backgrounds. The
  // parent supplies positioning (relative + overflow-hidden) and an
  // overlay above us so the foreground copy stays readable.
  if (presentation === "bleed") {
    return (
      <div
        aria-hidden
        className={cn("absolute inset-0 overflow-hidden", className)}
      >
        {slides.map((s, i) => (
          <Image
            key={s.src}
            src={s.src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover object-top transition-opacity duration-1000 ease-in-out",
              i === active ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("mx-auto w-full", SIZE_CLASSES[size], className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Product screenshots"
    >
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-lg ring-1 ring-foreground/5">
        <div
          ref={frameRef}
          className={cn(
            "relative aspect-[16/10] w-full bg-muted",
            enableHoverZoom && "cursor-zoom-in",
          )}
          onMouseMove={handleLensMove}
          onMouseLeave={handleLensLeave}
        >
          {slides.map((s, i) => (
            <Image
              key={s.src}
              src={s.src}
              alt={s.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className={cn(
                "object-cover object-top transition-opacity duration-500",
                i === active ? "opacity-100" : "opacity-0",
              )}
            />
          ))}

          {enableHoverZoom &&
            lensPos &&
            frameSize.w > 0 &&
            frameSize.h > 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-full border-2 border-white/85 shadow-2xl ring-1 ring-foreground/30"
                style={{
                  width: lensSize,
                  height: lensSize,
                  left: lensPos.x - lensSize / 2,
                  top: lensPos.y - lensSize / 2,
                  backgroundImage: `url(${slide.src})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${frameSize.w * zoom}px ${frameSize.h * zoom}px`,
                  backgroundPosition: `${-(lensPos.x * zoom - lensSize / 2)}px ${-(lensPos.y * zoom - lensSize / 2)}px`,
                }}
              />
            )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-foreground/10 backdrop-blur transition-colors hover:bg-background"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-foreground/10 backdrop-blur transition-colors hover:bg-background"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Caption — re-keys on slide change so the fade-in transition replays. */}
      <p
        key={active}
        aria-live="polite"
        className="mt-4 text-center text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      >
        {slide.caption}
      </p>

      {total > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={cn(
                "h-2 rounded-full transition-all",
                i === active
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
