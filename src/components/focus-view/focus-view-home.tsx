"use client";

/**
 * Client component on purpose — `buttonVariants` is exported from a
 * "use client" module and cannot be invoked at server-render time
 * (Next.js refuses to call it across the boundary). Marking this file
 * "use client" lets us style the card-action <Link>s with the shared
 * button styling without forking it. No server-only data is needed
 * here; the only prop is the user's name, which the dashboard route
 * passes in after fetching the profile.
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
import { cn } from "@/lib/utils";

interface FocusViewHomeProps {
  userName: string;
}

/**
 * BP-099 Focus View — the simplified home page for users with
 * `user_profiles.ui_mode = 'focus'`. Replaces the standard dashboard
 * with four large cards that cover the actions a user takes most
 * often: brainstorm ideas, create a post, return to drafts, check
 * the schedule.
 *
 * Visual treatment (added 2026-04-28 per owner feedback):
 *   - Two large blurred gradient blobs (top-right + bottom-left) in the
 *     brand blues for soft depth without competing with the cards
 *   - Subtle dot-grid pattern at low opacity to add texture
 *   - Gradient text on the heading + a sparkle accent
 *   - Cards lift slightly on hover for tactility
 * All CSS-only; no images, no extra dependencies. Theme-aware via the
 * existing CSS variables and dark: variants.
 */
/**
 * Time-of-day greeting used in the welcome pill. Buckets:
 *   05:00–11:59 — "Good morning"
 *   12:00–16:59 — "Good afternoon"
 *   17:00–04:59 — "Good evening"
 *
 * Computed in useEffect so it always reflects the user's local
 * timezone without risking a hydration mismatch (the server has no
 * way to know the user's clock).
 */
function computeTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function FocusViewHome({ userName }: FocusViewHomeProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  // "Welcome" is a stable fallback that renders during initial hydration;
  // computeTimeGreeting() runs on mount and replaces it. Slight text swap
  // is acceptable — no layout shift since the pill keeps the same shape.
  // The setState-in-useEffect lint warning here matches the same pattern
  // in theme-setting.tsx — both need a post-mount render to avoid SSR
  // mismatches on client-only data (theme preference there, local time
  // here). Accepted convention in this codebase; lint exits 0.
  const [greeting, setGreeting] = useState<string>("Welcome");
  useEffect(() => {
    setGreeting(computeTimeGreeting());
  }, []);

  return (
    <div className="relative isolate -mx-4 -my-4 flex min-h-[calc(100vh-3.5rem)] flex-col overflow-hidden lg:-mx-6 lg:-my-6">
      {/* Decorative background — sits behind everything via z-index.
          Three blobs (top-right, mid-right, bottom-left) plus a full-bleed
          dot pattern keep the whole page visually engaged at any height. */}

      {/* Top-right gradient blob — strong brand blue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 -z-10 size-[42rem] rounded-full bg-gradient-to-br from-blue-500/40 via-cyan-400/30 to-transparent blur-3xl dark:from-blue-600/35 dark:via-blue-500/25"
      />
      {/* Mid-right secondary blob — fills the right side as the page gets taller */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 top-1/2 -z-10 size-[38rem] -translate-y-1/4 rounded-full bg-gradient-to-l from-sky-400/30 via-cyan-300/20 to-transparent blur-3xl dark:from-sky-500/25 dark:via-cyan-500/15"
      />
      {/* Bottom-left gradient blob — anchors the lower half */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-[42rem] rounded-full bg-gradient-to-tr from-indigo-500/35 via-purple-400/25 to-transparent blur-3xl dark:from-indigo-600/35 dark:via-purple-500/20"
      />
      {/* Bottom-center accent — soft glow to lift the empty area */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 size-[28rem] rounded-full bg-gradient-to-t from-violet-400/20 to-transparent blur-3xl dark:from-violet-500/20"
      />

      {/* Full-bleed dot-grid pattern with a soft vignette so it never feels harsh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.25] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "var(--color-muted-foreground, #94a3b8)",
          maskImage:
            "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 100% at 50% 50%, black 40%, transparent 90%)",
        }}
      />

      {/* Content — vertically centered in the full-height container so the
          whitespace is balanced top/bottom rather than dumped at the bottom. */}
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card order follows the editorial flow: ideate → create →
              finish drafts → check schedule. This matches how a session
              naturally progresses for a content creator. */}

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
                  click. After they save ideas, the dialog closes and the
                  page is already on /ideas so they see their new ideas. */}
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
      </div>
    </div>
  );
}
