"use client";

/**
 * BP-045 — Card-shaped third-party ad slot for grid layouts.
 *
 * Wraps the underlying `<AdSlot>` in a Card with a clear "Sponsored"
 * badge so the unit is unmistakably an ad rather than user content. Used
 * in the Posts and Ideas page grids to fill the top-right cell of the
 * three-column layout.
 *
 * Tier gating: only renders ads for tiers where `<AdSlot>` returns a
 * non-null result for the given `placement`. Per BP-045 v1, the
 * placements where this card is used (`dashboard`, `between-content`)
 * are Free-only — Personal sees no SponsoredCard. Pro / Team / Enterprise
 * never see it. The wrapper itself returns null when AdSlot returns null,
 * so the grid doesn't render an empty card outline.
 */

import { Card } from "@/components/ui/card";
import { AdSlot, type AdPlacement } from "@/components/ads/ad-slot";
import type { SubscriptionTier } from "@/lib/constants";
import { TIER_FEATURES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SponsoredCardProps {
  tier: SubscriptionTier;
  placement: AdPlacement;
  /** Optional className for the outer Card. Used to control grid placement. */
  className?: string;
}

function isAdEligible(tier: SubscriptionTier, placement: AdPlacement): boolean {
  const row = TIER_FEATURES.find((f) => f.key === "ad_experience");
  if (!row) return false;
  const v = row[tier];
  if (typeof v !== "string") return false;
  if (v === "None") return false;
  // "Limited" (Personal) only sees ads on launch-pad per BP-045 v1.
  if (v === "Limited" && placement !== "launch-pad") return false;
  return true;
}

export function SponsoredCard({ tier, placement, className }: SponsoredCardProps) {
  if (!isAdEligible(tier, placement)) return null;

  return (
    <Card
      role="complementary"
      aria-label="Sponsored content"
      className={cn(
        "relative flex flex-col justify-between overflow-hidden border-dashed",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sponsored
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">
          ad
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        {/* AdSlot self-gates by tier; we forward the same value so
            placeholder/AdSense markup are consistent with other surfaces. */}
        <AdSlot tier={tier} placement={placement} className="w-full" />
      </div>
    </Card>
  );
}
