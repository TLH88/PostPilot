"use client";

/**
 * BP-099 Launch Pad — the simplified launcher home for every user.
 *
 * Lives at `/launch-pad` and is the post-login default destination
 * (root callbacks land here instead of /dashboard). The full Dashboard
 * remains at `/dashboard` and is reachable from the sidebar; Launch Pad
 * is a separate, additive surface — not a replacement.
 *
 * Originally specced as "Focus View" with a per-user dual-mode toggle
 * (BP-099 v1, see docs/plans/bp-099-guided-ui-mode.md). Owner direction
 * 2026-05-04 simplified the design: Launch Pad ships as a single home
 * for everyone — no view toggle, no `ui_mode` column, no Settings picker.
 *
 * Visual treatment kept from the v1 implementation: gradient blobs
 * (top-right + mid-right + bottom-left + bottom-center), full-bleed
 * dot-grid pattern under a soft vignette, gradient-text greeting, and
 * cards that lift on hover. CSS-only; theme-aware via existing tokens.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PenLine,
  FileText,
  CalendarDays,
  Lightbulb,
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

interface LaunchPadHomeProps {
  userName: string;
  tier: SubscriptionTier;
}

/**
 * Time-of-day greeting bucket. Computed in useEffect so it always
 * reflects the user's local timezone without risking hydration mismatch
 * (the server has no way to know the user's clock).
 *   05:00–11:59 — "Good morning"
 *   12:00–16:59 — "Good afternoon"
 *   17:00–04:59 — "Good evening"
 */
function computeTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LaunchPadHome({ userName, tier }: LaunchPadHomeProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  // "Welcome" is a stable fallback during initial hydration;
  // computeTimeGreeting() runs on mount and replaces it. Slight text
  // swap is acceptable — no layout shift since the pill keeps the same
  // shape. Same setState-in-useEffect pattern used elsewhere for
  // client-only data (theme, time).
  const [greeting, setGreeting] = useState<string>("Welcome");
  useEffect(() => {
    // One-shot client-only data (matches mobile-launch-pad + notifications-bell pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(computeTimeGreeting());
  }, []);

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Content — vertically centered in the full-height container so the
          whitespace is balanced top/bottom rather than dumped at the bottom.
          Ambient gradient + dot-grid background now lives in <AppBackground>
          at the (app) layout so every page shares it. */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-12 lg:px-8">
        <header className="mb-12 text-center">
          {/* Personal greeting reads first: time-aware salutation + name.
              Lighter weight than the question below so the visual hierarchy
              still emphasizes the action prompt. */}
          <p className="mb-2 text-xl font-medium text-muted-foreground md:text-2xl">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text font-semibold text-transparent dark:from-blue-400 dark:to-cyan-400">
              {firstName}
            </span>
            .
          </p>

          {/* Main heading — the assistant's question. Larger and bolder so
              it carries the visual weight of the page. */}
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-5xl">
            What can I help you focus on today?
          </h1>
        </header>

        {/* Card order follows the editorial flow: ideate → create →
            finish drafts → check schedule. This matches how a session
            naturally progresses for a content creator. */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1 — Generate New Ideas */}
          <Card className="group flex flex-col border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 ring-1 ring-amber-200/50 transition-transform group-hover:scale-110 dark:from-amber-500/20 dark:to-amber-500/5 dark:ring-amber-500/20">
                <Lightbulb className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle>Generate New Ideas</CardTitle>
              <CardDescription>
                Spark new content ideas for the week ahead.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              {/* The ?open=generate query param signals the Ideas page to
                  auto-open the AI Idea Generator dialog on mount. This
                  lands the user directly in brainstorming with no extra
                  click. */}
              <Link
                href="/ideas?open=generate"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Brainstorm
              </Link>
            </CardContent>
          </Card>

          {/* 2 — Create a Post */}
          <Card className="group flex flex-col border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 ring-1 ring-blue-200/50 transition-transform group-hover:scale-110 dark:from-blue-500/20 dark:to-blue-500/5 dark:ring-blue-500/20">
                <PenLine className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Create a Post</CardTitle>
              <CardDescription>
                Craft a new post in your voice.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <NewPostButton className="w-full gap-2" label="Start writing" />
            </CardContent>
          </Card>

          {/* 3 — View Draft Posts */}
          <Card className="group flex flex-col border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 ring-1 ring-violet-200/50 transition-transform group-hover:scale-110 dark:from-violet-500/20 dark:to-violet-500/5 dark:ring-violet-500/20">
                <FileText className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <CardTitle>View Draft Posts</CardTitle>
              <CardDescription>Pick up where you left off.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link
                href="/posts"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Continue
              </Link>
            </CardContent>
          </Card>

          {/* 4 — View Scheduled Posts */}
          <Card className="group flex flex-col border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 ring-1 ring-emerald-200/50 transition-transform group-hover:scale-110 dark:from-emerald-500/20 dark:to-emerald-500/5 dark:ring-emerald-500/20">
                <CalendarDays className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle>View Scheduled Posts</CardTitle>
              <CardDescription>
                Review your upcoming content calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link
                href="/calendar"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                View calendar
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* BP-045 — Launch Pad ad surface (primary). Renders only for
            Free + Personal tiers; AdSlot returns null for Pro+. The slot
            sits below the editorial card row so it never displaces the
            primary actions. */}
        <div className="mx-auto mt-12 w-full max-w-3xl">
          <AdSlot tier={tier} placement="launch-pad" />
        </div>
      </div>
    </div>
  );
}
