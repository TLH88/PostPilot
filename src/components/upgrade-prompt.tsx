"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/constants";

interface UpgradePromptProps {
  feature: string;
  requiredTier: SubscriptionTier;
  variant?: "inline" | "banner" | "compact";
}

export function UpgradePrompt({
  feature,
  requiredTier,
  variant = "inline",
}: UpgradePromptProps) {
  const tierLabel = SUBSCRIPTION_TIERS[requiredTier].label;
  const tierPrice = SUBSCRIPTION_TIERS[requiredTier].price;

  if (variant === "compact") {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Lock className="size-3" />
        <span>{tierLabel}+</span>
      </Link>
    );
  }

  if (variant === "banner") {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {feature} requires {tierLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade to {tierLabel} ({tierPrice}) to unlock {feature.toLowerCase()} and more.
            </p>
            <Link
              href="/pricing"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View plans
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default: inline
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 px-3 py-2">
      <Lock className="size-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {feature} is available on{" "}
        <Link href="/pricing" className="font-medium text-primary hover:underline">
          {tierLabel}+
        </Link>
      </span>
    </div>
  );
}
