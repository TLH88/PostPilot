"use client";

/**
 * BP-045 — First-party "Upgrade" promotional unit, tier-aware.
 *
 * Distinct from `<AdSlot>` (third-party AdSense): this is our OWN content
 * (copy + CTA pointing at /pricing), so ad-blockers don't affect it and
 * it doesn't require AdSense activation.
 *
 * Behavior by tier (per owner direction 2026-05-04):
 *   - Free      → carousel alternating between a Personal upsell and a
 *                 Pro upsell every ~6 seconds (auto-rotate). Two dots
 *                 indicate position. Pause on hover so a user reading
 *                 mid-rotation isn't ripped away.
 *   - Personal  → static Pro upsell only (we don't downsell back to
 *                 their current tier).
 *   - Pro+      → component is gated upstream in `Sidebar`, never
 *                 mounted here.
 *
 * `prefers-reduced-motion` users get a static first slide for Free
 * (no auto-rotate); the dots remain so they can mentally model that
 * a second slide exists, even though we don't animate to it.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/lib/constants";

interface UpgradeAdProps {
  /** Current user's tier. Drives which slide(s) render. */
  tier: SubscriptionTier;
  /** Optional class for the outer wrapper. Caller controls margins. */
  className?: string;
}

interface Slide {
  key: "personal" | "professional";
  badge: string;
  title: string;
  perks: readonly string[];
  cta: string;
}

/**
 * Personal-tier upsell — pitched to Free users on what stepping up to
 * Personal unlocks (over Free). Bullets emphasize concrete monthly
 * uplift + the ad-experience downgrade.
 */
const PERSONAL_SLIDE: Slide = {
  key: "personal",
  badge: "Personal",
  title: "Go Personal",
  perks: [
    "30 posts + 20 brainstorms / month",
    "AI Image Generation",
    "Hook & Performance Analytics",
    "Lighter ad experience",
  ],
  cta: "Upgrade Now",
};

/**
 * Pro-tier upsell — pitched to Free users (in the carousel) and
 * Personal users (static). Bullets reflect the 2026-05-04 product
 * change: Post Templates moved to Team; Advanced AI Collaboration is
 * the new Pro headline feature in slot #2.
 */
const PROFESSIONAL_SLIDE: Slide = {
  key: "professional",
  badge: "Professional",
  title: "Go Professional",
  perks: [
    "Bring your own AI key — unlimited usage",
    "Advanced AI Collaboration",
    "Content Library: save hooks, CTAs, snippets",
    "No ads",
  ],
  cta: "Upgrade Now",
};

const ROTATION_INTERVAL_MS = 6000;

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefers;
}

export function UpgradeAd({ tier, className }: UpgradeAdProps) {
  const slides = useMemo<Slide[]>(() => {
    // Per owner direction 2026-05-04: both Free AND Personal users see the
    // 2-slide carousel (Personal pitch + Pro pitch). For a Personal viewer
    // the Personal slide functions as a tier-benefits reminder rather than
    // an upsell — same copy in both contexts to keep the carousel content
    // a single source of truth.
    if (tier === "free" || tier === "personal") {
      return [PERSONAL_SLIDE, PROFESSIONAL_SLIDE];
    }
    return [PROFESSIONAL_SLIDE];
  }, [tier]);

  const reducedMotion = usePrefersReducedMotion();

  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-rotate Free users between the two slides. Skip for single-slide
  // tiers (Personal) and for users who have prefers-reduced-motion set.
  useEffect(() => {
    if (slides.length <= 1) return;
    if (reducedMotion) return;
    if (paused) return;
    const id = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slides.length, reducedMotion, paused]);

  // Clamp activeIdx if slides shrinks (e.g. tier changes mid-session
  // because of a subscription upgrade — defensive).
  const safeIdx = Math.min(activeIdx, slides.length - 1);
  const slide = slides[safeIdx];

  return (
    <div
      role="complementary"
      aria-label={`Upgrade to ${slide.badge} promotion`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "relative overflow-hidden rounded-lg border border-blue-300/40 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-purple-500/10 p-3 shadow-sm dark:border-blue-700/40 dark:from-blue-500/15 dark:via-cyan-500/10 dark:to-purple-500/15",
        className,
      )}
    >
      <div
        // aria-live polite — screen readers get a quiet announcement when
        // the slide rotates so the change isn't silently invisible.
        aria-live="polite"
        // Key on slide.key so React swaps the subtree on rotation, which
        // re-runs the fade-in transition rather than mutating in place.
        key={slide.key}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold tracking-tight text-sidebar-foreground">
            {slide.title}
          </p>
        </div>

        <ul className="mb-3 space-y-1 text-[11px] leading-snug text-sidebar-foreground/80">
          {slide.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-1.5">
              <span aria-hidden="true" className="mt-0.5 text-blue-500">
                •
              </span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/pricing"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {slide.cta}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Carousel dots — only when there are multiple slides. Clickable
          so a user can jump between Personal and Pro pitches manually. */}
      {slides.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`Show ${s.badge} upgrade pitch`}
              aria-current={i === safeIdx ? "true" : undefined}
              onClick={() => setActiveIdx(i)}
              className={cn(
                "size-1.5 rounded-full transition-all",
                i === safeIdx
                  ? "w-4 bg-blue-500"
                  : "bg-sidebar-foreground/30 hover:bg-sidebar-foreground/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
