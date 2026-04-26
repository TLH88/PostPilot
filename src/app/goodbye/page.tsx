"use client";

/**
 * BP-131 Session 2: Post-deletion confirmation page.
 *
 * Public route — the user just deleted their account, so they're
 * signed out by the time they land here. Explains the grace period
 * and offers a path to restore via support.
 *
 * Marked "use client" because it imports buttonVariants from
 * components/ui/button.tsx, which is itself a client module. A server
 * component that imports a client-only export trips Next.js 16's
 * static prerender check and fails the entire build (this broke
 * develop + main from 2026-04-24 to 2026-04-26 — see ACTIVITY_LOG).
 */
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function GoodbyePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="size-12 text-primary mb-4" />

      <h1 className="text-2xl font-bold tracking-tight">Your account has been scheduled for deletion</h1>

      <p className="mt-3 text-muted-foreground">
        Your PostPilot account is suspended immediately. After a{" "}
        <span className="font-medium text-foreground">30-day grace period</span>,
        all of your data — posts, ideas, library items, uploaded files,
        scheduled posts, and analytics — will be permanently removed.
      </p>

      <div className="mt-6 w-full rounded-lg border bg-muted/30 p-4 text-left text-sm">
        <p className="font-medium flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          Changed your mind?
        </p>
        <p className="mt-1 text-muted-foreground">
          Contact support during the grace window and we&apos;ll restore your
          account. After 30 days, deletion is permanent.
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Return to home
        </Link>
      </div>
    </div>
  );
}
