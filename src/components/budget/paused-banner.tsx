"use client";

/**
 * BP-085 Phase 3 — Persistent banner shown across all authenticated pages
 * when a user's AI access has been paused due to exceeding their monthly
 * USD budget.
 *
 * Renders nothing when not paused. When paused, displays a non-dismissable
 * amber banner above the existing LinkedInStatusBanner with an Upgrade CTA
 * pointing at /pricing. Cannot be dismissed — disappears only when the
 * paused state clears (admin unpause, threshold raised, or new billing
 * period in the future).
 *
 * For now the only CTA is "Upgrade". Future BP will add "Purchase
 * additional AI credits" once the credit-pack system ships (BP-124).
 */

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PausedBannerProps {
  paused: boolean;
  reason?: string | null;
  className?: string;
}

export function PausedBanner({ paused, reason, className }: PausedBannerProps) {
  if (!paused) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mb-4 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
        <AlertTriangle
          aria-hidden="true"
          className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
        />
        <p className="flex-1 text-amber-900 dark:text-amber-100">
          <span className="font-medium">AI features paused.</span>{" "}
          {reason ?? "You've reached your monthly AI usage limit."}{" "}
          Upgrade your plan to continue.
        </p>
        <Link
          href="/pricing"
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
