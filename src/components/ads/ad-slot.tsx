"use client";

/**
 * BP-045 — Tier-aware ad slot.
 *
 * Reads `subscription_tier` and `TIER_FEATURES.ad_experience` to decide
 * what (if anything) to render:
 *   - "Full"      (Free)               → full-size responsive ad unit
 *   - "Limited"   (Personal)           → small banner; Launch Pad only
 *                                        per BP-045 v1 — see `placement`
 *   - "None"      (Pro / Team / Ent.)  → renders null
 *
 * In v1 we ship a clearly-labelled placeholder rather than a real
 * AdSense unit. When the publisher ID env var is set the component
 * will swap in real `<ins class="adsbygoogle">` markup; until then it
 * shows a developer-readable placeholder so we can verify gating, layout,
 * and the BP-085 P3 banner/modal interactions without a live AdSense
 * account. Toggling between modes is one env-var change.
 *
 * Personal-tier visibility filter: the "Limited" tier only sees ads on
 * the `launch-pad` placement (per owner direction 2026-05-04 — Launch
 * Pad is the primary surface for Free + Personal). Other placements
 * (`dashboard`, `sidebar`, `between-content`) are gated to Free-only.
 */

import { TIER_FEATURES, type SubscriptionTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type AdPlacement =
  | "launch-pad"
  | "dashboard"
  | "sidebar"
  | "between-content";

interface AdSlotProps {
  tier: SubscriptionTier;
  placement: AdPlacement;
  /** Optional: extra class applied to the outer wrapper. */
  className?: string;
}

/**
 * Look up `ad_experience` value for a tier from TIER_FEATURES.
 * Returns "Full" | "Limited" | "None" or null if not configured.
 */
function adDensity(tier: SubscriptionTier): "Full" | "Limited" | "None" | null {
  const row = TIER_FEATURES.find((f) => f.key === "ad_experience");
  if (!row) return null;
  const v = row[tier];
  if (typeof v !== "string") return null;
  if (v === "Full" || v === "Limited" || v === "None") return v;
  return null;
}

const ADSENSE_PUBLISHER_ID =
  process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "";
const ADSENSE_ENABLED =
  process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" &&
  ADSENSE_PUBLISHER_ID.length > 0;

export function AdSlot({ tier, placement, className }: AdSlotProps) {
  const density = adDensity(tier);
  if (density === null || density === "None") return null;

  // Personal tier ("Limited") sees ads ONLY on the Launch Pad placement
  // per BP-045 v1. All other placements are Free-only ("Full").
  if (density === "Limited" && placement !== "launch-pad") return null;

  // Per-placement size hint. Real AdSense responsive units adapt
  // automatically; the placeholder mirrors typical IAB sizes for
  // visual verification at design time.
  const size = sizeFor(placement, density);

  if (!ADSENSE_ENABLED) {
    // Placeholder — clearly labelled, dev-readable, brand-neutral.
    return (
      <div
        role="complementary"
        aria-label="Advertisement (placeholder — AdSense not yet enabled)"
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground",
          className,
        )}
        style={{ minHeight: size.h, minWidth: size.minW }}
      >
        <span className="font-mono text-[10px] uppercase tracking-wider">
          ad placeholder
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/60">
          density={density.toLowerCase()} · placement={placement}
        </span>
      </div>
    );
  }

  // Real AdSense markup. Loads `adsbygoogle.js` once via the global hook
  // injected in `<head>` (TBD — see ToS clause + AdSense activation BP).
  return (
    <ins
      className={cn("adsbygoogle block", className)}
      style={{
        display: "block",
        minHeight: size.h,
        minWidth: size.minW,
      }}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={slotIdFor(placement, density)}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-ad-density={density.toLowerCase()}
      data-ad-placement={placement}
    />
  );
}

function sizeFor(
  placement: AdPlacement,
  density: "Full" | "Limited",
): { h: number; minW: number } {
  if (placement === "sidebar") return { h: 250, minW: 160 };
  if (placement === "between-content") return { h: 100, minW: 320 };
  if (placement === "launch-pad" && density === "Limited") {
    // Personal tier Launch Pad — short banner.
    return { h: 90, minW: 320 };
  }
  // launch-pad Full + dashboard.
  return { h: 250, minW: 320 };
}

function slotIdFor(placement: AdPlacement, density: "Full" | "Limited"): string {
  // Real slot IDs are configured per-placement on the AdSense side.
  // Until we have them, fall back to a deterministic key — AdSense
  // accepts arbitrary `data-ad-slot` strings, but a real ID will
  // come from env vars (NEXT_PUBLIC_ADSENSE_SLOT_*) when activated.
  const fromEnv =
    process.env[
      `NEXT_PUBLIC_ADSENSE_SLOT_${placement.toUpperCase().replace(/-/g, "_")}_${density.toUpperCase()}`
    ];
  return fromEnv ?? `${placement}-${density.toLowerCase()}`;
}
