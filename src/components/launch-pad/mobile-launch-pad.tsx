"use client";

/**
 * BP-099 Phase 2 — Mobile shell for `/launch-pad`.
 *
 * Renders below the project's `md` breakpoint (768px). The desktop
 * launcher (`<LaunchPadHome />`) keeps rendering at and above that width
 * — both are mounted on the page and gated by Tailwind responsive
 * classes (`hidden md:block` / `md:hidden`). No JS user-agent sniffing,
 * no `useMediaQuery` — visibility is purely CSS-driven so server render
 * and client hydration agree.
 *
 * Layout choice: cards stack vertically as a single column. Per the
 * BP-099 design doc §4 ("the four-card Focus View layout adapts to mobile
 * by stacking the cards vertically — per the third owner mockup") and
 * the third mockup at `docs/images/bp-099/focus-view-mobile-shell.png`.
 * Stacked-cards (over a denser list) preserve the visual identity of
 * the desktop launcher — same iconography, same descriptions, same
 * call-to-action buttons — making the mobile experience feel like the
 * same product, not a stripped-down menu.
 *
 * Why this is `"use client"`: it composes other client-only leaves
 * (`NewPostButton`) and uses the `useEffect`/`useState` time-of-day
 * greeting pattern from the desktop `LaunchPadHome`. The parent page
 * (`/launch-pad/page.tsx`) stays a server component — the "use client"
 * boundary lives at this leaf, not at the page (per the Server/Client
 * Import Trap memory note).
 *
 * BP-099 P2 promotion (post-2026-05-06): the bottom tab bar + create
 * FAB used to be mounted here. They were lifted into the global
 * `(app)` layout via `<MobileAppShell />` so every (app) route below
 * `md` gets them, not just `/launch-pad`. This component now renders
 * only the launcher cards.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  PenLine,
  FileText,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { NewPostButton } from "@/components/posts/new-post-button";
import { AdSlot } from "@/components/ads/ad-slot";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/lib/constants";

interface MobileLaunchPadProps {
  userName: string;
  tier: SubscriptionTier;
}

/** Mirrors the desktop `LaunchPadHome` greeting bucket so the two
 *  surfaces feel like the same product. */
function computeTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function MobileLaunchPad({ userName, tier }: MobileLaunchPadProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  // "Welcome" is a stable SSR/hydration-safe fallback; the real
  // time-of-day greeting is computed on mount because the server has
  // no way to know the user's local clock. This is the same pattern as
  // the desktop `LaunchPadHome` — keep them aligned.
  const [greeting, setGreeting] = useState<string>("Welcome");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(computeTimeGreeting());
  }, []);

  return (
    <div className="relative -mx-4 -mt-4 flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Scrollable content. The (app) layout's `pb-20 md:pb-4`
          handles tab-bar clearance globally; we keep a small extra
          `pb-8` here so the FAB (which floats 16px above the tab bar)
          doesn't visually crowd the trailing ad slot. */}
      <div className="flex-1 px-4 pt-6 pb-8">
        <header className="mb-6">
          <p className="mb-1 text-base font-medium text-muted-foreground">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text font-semibold text-transparent dark:from-blue-400 dark:to-cyan-400">
              {firstName}
            </span>
            .
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            What can I help you focus on today?
          </h1>
        </header>

        {/* Same editorial order as desktop: ideate → create → drafts →
            scheduled. Cards stack vertically (single column) for
            thumb-friendly scanning on phones. */}
        <div className="flex flex-col gap-4">
          {/* 1 — Generate New Ideas */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 ring-1 ring-amber-200/50 dark:from-amber-500/20 dark:to-amber-500/5 dark:ring-amber-500/20">
                <Lightbulb className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-lg">Generate New Ideas</CardTitle>
              <CardDescription>
                Spark new content ideas for the week ahead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/ideas?open=generate"
                className={cn(buttonVariants({ size: "default" }), "w-full")}
              >
                Brainstorm
              </Link>
            </CardContent>
          </Card>

          {/* 2 — Create a Post */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 ring-1 ring-blue-200/50 dark:from-blue-500/20 dark:to-blue-500/5 dark:ring-blue-500/20">
                <PenLine className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-lg">Create a Post</CardTitle>
              <CardDescription>Craft a new post in your voice.</CardDescription>
            </CardHeader>
            <CardContent>
              <NewPostButton className="w-full gap-2" label="Start writing" />
            </CardContent>
          </Card>

          {/* 3 — View Draft Posts */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 ring-1 ring-violet-200/50 dark:from-violet-500/20 dark:to-violet-500/5 dark:ring-violet-500/20">
                <FileText className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <CardTitle className="text-lg">View Draft Posts</CardTitle>
              <CardDescription>Pick up where you left off.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/posts"
                className={cn(buttonVariants({ size: "default" }), "w-full")}
              >
                Continue
              </Link>
            </CardContent>
          </Card>

          {/* 4 — View Scheduled Posts */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 ring-1 ring-emerald-200/50 dark:from-emerald-500/20 dark:to-emerald-500/5 dark:ring-emerald-500/20">
                <CalendarDays className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-lg">View Scheduled Posts</CardTitle>
              <CardDescription>
                Review your upcoming content calendar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/calendar"
                className={cn(buttonVariants({ size: "default" }), "w-full")}
              >
                View calendar
              </Link>
            </CardContent>
          </Card>

          {/* BP-045 — Mobile Launch Pad ad surface (primary). Shown for
              Free + Personal tiers only; AdSlot returns null for Pro+.
              Tab bar + FAB are mounted globally by `<MobileAppShell />`
              from the (app) layout — page-level mounts removed during
              the BP-099 P2 promotion. */}
          <AdSlot tier={tier} placement="launch-pad" className="mt-2" />
        </div>
      </div>
    </div>
  );
}
