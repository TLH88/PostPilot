import Link from "next/link";
import { PenLine, FileText, CalendarDays, Lightbulb } from "lucide-react";
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
 * often: create a fresh post, return to drafts, check the schedule,
 * brainstorm new ideas.
 *
 * This is a thin presentational layer — each card delegates to the
 * existing flows (NewPostButton → BP-133 title dialog; the other
 * three are simple navigation links). No new business logic lives
 * here.
 */
export function FocusViewHome({ userName }: FocusViewHomeProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto max-w-6xl px-2 pb-12 pt-2 sm:px-4 sm:pt-6">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          What would you like to do today, {firstName}?
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Pick an action below to get started.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1 — Create a Post */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10">
              <PenLine className="size-5 text-primary" />
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

        {/* 2 — View Draft Posts */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
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

        {/* 3 — View Scheduled Posts */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-5 text-primary" />
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

        {/* 4 — Generate New Ideas */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10">
              <Lightbulb className="size-5 text-primary" />
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
      </div>
    </div>
  );
}
