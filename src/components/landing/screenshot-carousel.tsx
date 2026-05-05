"use client";

/**
 * Screenshot carousel for the marketing landing page.
 *
 * Two presentation modes:
 *   - "card"  (default) — 3D peek layout: center slide at full scale, prev
 *                         and next slides peek in from either side at 0.85
 *                         scale + slight Y-rotation. Captions overlay the
 *                         active slide as a bottom gradient. Auto-rotates
 *                         every `intervalMs` (default 5s) with hover-pause,
 *                         arrows, and dot indicators.
 *   - "bleed"           — chromeless full-size rotator for hero backgrounds.
 *
 * Sizing is preset-based via `size` (sm | md | lg | xl | 2xl, default xl).
 * The size constrains the FRAME (active slide width); the section around it
 * spans whatever width its parent provides, leaving room for side slides
 * to peek into.
 */

import { useCallback, useEffect, useState } from "react";
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
  /**
   * Visual mode:
   *   "card" (default) — framed 3D peek layout with arrows, dots, captions.
   *   "bleed"          — chromeless full-size rotator suitable for hero
   *                      backgrounds; mounts as `absolute inset-0` so the
   *                      parent must be `relative` (or `isolate`). Skips
   *                      controls and crossfades slowly so it reads as
   *                      ambient motion.
   */
  presentation?: "card" | "bleed";
}

export function ScreenshotCarousel({
  slides,
  size = "xl",
  intervalMs = 5000,
  className,
  presentation = "card",
}: ScreenshotCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

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

  if (total === 0) return null;

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

  // Card mode: 3D peek layout — center slide is full-scale, the prev/next
  // slides peek in from each side at 0.85 scale + slight Y-rotation. The
  // "opposite" slide (active+2 in a 4-slide ring) parks off-screen right at
  // opacity 0 as a transition slot. Forward navigation animates smoothly;
  // backward navigation snaps for that one slot but it's invisible anyway.
  function visualSlot(i: number): { offset: -1 | 0 | 1 | 2; visible: boolean } {
    if (total <= 1) return { offset: 0, visible: i === active };
    const raw = (i - active + total) % total;
    if (raw === 0) return { offset: 0, visible: true };
    if (raw === 1) return { offset: 1, visible: true };
    if (raw === total - 1) return { offset: -1, visible: true };
    return { offset: 2, visible: false };
  }

  function slotStyle(offset: -1 | 0 | 1 | 2): React.CSSProperties {
    if (offset === 0) {
      return {
        transform: "translateX(0%) scale(1) rotateY(0deg)",
        opacity: 1,
        zIndex: 30,
        filter: "blur(0)",
      };
    }
    if (offset === 1) {
      return {
        transform: "translateX(90%) scale(0.85) rotateY(-14deg)",
        opacity: 0.7,
        zIndex: 20,
        filter: "blur(1px)",
      };
    }
    if (offset === -1) {
      return {
        transform: "translateX(-90%) scale(0.85) rotateY(14deg)",
        opacity: 0.7,
        zIndex: 20,
        filter: "blur(1px)",
      };
    }
    // offset === 2 — hidden far slot used as a transition staging area,
    // parked well off-stage so it never accidentally re-appears.
    return {
      transform: "translateX(180%) scale(0.7) rotateY(-18deg)",
      opacity: 0,
      zIndex: 10,
      filter: "blur(2px)",
    };
  }

  return (
    <div
      className={cn("w-full", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Product screenshots"
    >
      {/* 3D peek stage spans the FULL parent width, with overflow-hidden so
          side slides extending past the centered frame's edges get clipped
          at the section bounds (not the frame bounds). The frame inside
          carries the size= max-width and centers — the active slide fills
          the frame at scale(1); side slides translate beyond it into the
          empty wing space. */}
      <div
        className="relative overflow-hidden py-4"
        style={{ perspective: "1500px" }}
      >
        <div
          className={cn(
            "relative mx-auto aspect-[16/10]",
            SIZE_CLASSES[size],
          )}
        >
          {slides.map((s, i) => {
            const slot = visualSlot(i);
            const style = slotStyle(slot.offset);
            const isActive = slot.offset === 0;
            return (
              <button
                key={s.src}
                type="button"
                aria-hidden={!isActive}
                aria-label={isActive ? undefined : `Jump to ${s.caption}`}
                tabIndex={isActive ? -1 : 0}
                onClick={() => {
                  if (!isActive) setActive(i);
                }}
                className={cn(
                  // Slides fill the frame (inset-0). Side slides translate
                  // beyond the frame edge into the section's wing space —
                  // see slotStyle for offsets.
                  "absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                  !isActive && slot.visible && "cursor-pointer",
                )}
                style={{
                  ...style,
                  pointerEvents: slot.visible ? "auto" : "none",
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-2xl ring-1 ring-foreground/5">
                  <Image
                    src={s.src}
                    alt={s.alt}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-cover object-top"
                  />
                  {/* Caption — glass panel inset from the slide's bottom
                      edge. Theme-aware bg so it reads in light & dark mode
                      against any screenshot, not just dark imagery. */}
                  {isActive && (
                    <div
                      key={`caption-${active}`}
                      aria-live="polite"
                      className="pointer-events-none absolute inset-x-6 bottom-6 rounded-2xl border border-foreground/10 bg-background/80 px-6 py-4 shadow-xl backdrop-blur-lg motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 sm:inset-x-12 sm:bottom-10 sm:px-8 sm:py-5"
                    >
                      <p className="text-balance text-center text-xl font-semibold leading-snug text-foreground sm:text-2xl">
                        {s.caption}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}

        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 z-50 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-lg ring-1 ring-foreground/15 backdrop-blur transition-colors hover:bg-background sm:left-8"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 z-50 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-lg ring-1 ring-foreground/15 backdrop-blur transition-colors hover:bg-background sm:right-8"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>

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
