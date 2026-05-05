"use client";

/**
 * BP-045 — First-party "Upgrade to Pro" promotional unit.
 *
 * Distinct from the third-party `<AdSlot>` component: this is our OWN
 * content (copy + CTA pointing at /pricing), so ad-blockers don't affect
 * it and it does not require AdSense activation. Always renders for the
 * tiers we're upselling — Free + Personal.
 *
 * Currently lives in the desktop sidebar between the navigation list and
 * the Settings/Profile block. Pro / Team / Enterprise users never see it
 * (Sidebar gates the render).
 */

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeAdProps {
  /** Optional class for the outer wrapper. Caller controls margins. */
  className?: string;
}

const PRO_PERKS = [
  "Bring your own AI key — unlimited usage",
  "Content Library: save hooks, CTAs, snippets",
  "Post Templates",
  "No ads",
] as const;

export function UpgradeAd({ className }: UpgradeAdProps) {
  return (
    <div
      role="complementary"
      aria-label="Upgrade to Professional promotion"
      className={cn(
        "relative overflow-hidden rounded-lg border border-blue-300/40 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-purple-500/10 p-3 shadow-sm dark:border-blue-700/40 dark:from-blue-500/15 dark:via-cyan-500/10 dark:to-purple-500/15",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold tracking-tight text-sidebar-foreground">
          Go Professional
        </p>
      </div>

      <ul className="mb-3 space-y-1 text-[11px] leading-snug text-sidebar-foreground/80">
        {PRO_PERKS.map((perk) => (
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
        Upgrade Now
        <ArrowRight className="size-3" aria-hidden="true" />
      </Link>
    </div>
  );
}
