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
          ref={frameRef}
          className={cn(
            "relative mx-auto aspect-[16/10]",
            SIZE_CLASSES[size],
            enableHoverZoom && "cursor-zoom-in",
          )}
          onMouseMove={handleLensMove}
          onMouseLeave={handleLensLeave}
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
                  {/* Caption overlay — only on the active slide. Soft
                      bottom gradient so the white text reads against any
                      screenshot. Re-keys on active so it fades in fresh. */}
                  {isActive && (
                    <div
                      key={`caption-${active}`}
                      aria-live="polite"
                      className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-8 pt-20 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 sm:px-10 sm:pb-10"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)",
                      }}
                    >
                      <p className="text-xl font-semibold leading-snug text-white drop-shadow sm:text-2xl">
                        {s.caption}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {enableHoverZoom &&
            lensPos &&
            frameSize.w > 0 &&
            frameSize.h > 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute z-40 rounded-full border-2 border-white/85 shadow-2xl ring-1 ring-foreground/30"
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
