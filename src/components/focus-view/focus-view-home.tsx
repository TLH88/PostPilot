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

import Link from "next/link";
import {
  PenLine,
  FileText,
  CalendarDays,
  Lightbulb,
  Sparkles,
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
export function FocusViewHome({ userName }: FocusViewHomeProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  return (
    <div className="relative isolate -mx-4 -my-4 overflow-hidden lg:-mx-6 lg:-my-6">
      {/* Decorative background — sits behind everything via z-index. */}
      {/* Top-right gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 -z-10 size-[36rem] rounded-full bg-gradient-to-br from-blue-500/30 via-cyan-400/20 to-transparent blur-3xl dark:from-blue-600/30 dark:via-blue-500/20"
      />
      {/* Bottom-left gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-[32rem] rounded-full bg-gradient-to-tr from-indigo-500/25 via-purple-400/15 to-transparent blur-3xl dark:from-indigo-600/30 dark:via-purple-500/20"
      />
      {/* Subtle dot-grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18] dark:opacity-[0.10]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "var(--color-muted-foreground, #94a3b8)",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-14 lg:px-8">
        <header className="mb-12 text-center">
          {/* Sparkle accent above the heading */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            <span>Welcome back</span>
          </div>

          <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-5xl">
            What would you like to do today,
            <br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
              {firstName}
            </span>
            ?
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
            Pick an action below to get started.
          </p>
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
              <CardDescription>Brainstorm topics with AI.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link
                href="/ideas"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Open
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
                Start a fresh draft from scratch.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <NewPostButton className="w-full gap-2" label="Start" />
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
                Open
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
              <CardDescription>See your upcoming pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link
                href="/calendar"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                View
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
