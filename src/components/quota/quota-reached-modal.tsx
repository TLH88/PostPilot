"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Zap, Key } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
  type QuotaType,
} from "@/lib/constants";
import type { QuotaExceededBody } from "@/lib/errors/handle-quota-exceeded";

export const QUOTA_EXCEEDED_EVENT = "postpilot:quota-exceeded";

// `buildQuotaExceededResponse` in src/lib/quota.ts ships the user-facing
// label ("Free", "Personal", "Professional") rather than the internal key.
// Map back so we can drive the conditional plan-card rendering.
function normalizeTier(serverTier: string | undefined): SubscriptionTier {
  if (!serverTier) return "free";
  const direct = serverTier as SubscriptionTier;
  if (direct in SUBSCRIPTION_TIERS) return direct;
  for (const [key, def] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (def.label.toLowerCase() === serverTier.toLowerCase()) {
      return key as SubscriptionTier;
    }
  }
  return "free";
}

const QUOTA_LABELS: Record<QuotaType, string> = {
  posts: "posts",
  brainstorms: "brainstorms",
  chat_messages: "AI chats",
  scheduled_posts: "scheduled posts",
  image_generations: "image generations",
};

const QUOTA_LINE_LABELS: Record<QuotaType, string> = {
  posts: "Posts / mo",
  brainstorms: "Brainstorms / mo",
  chat_messages: "AI chat messages / mo",
  scheduled_posts: "Scheduled posts / mo",
  image_generations: "AI image generations / mo",
};

function formatLimit(n: number): string {
  return n === -1 ? "Unlimited" : String(n);
}

interface PlanCardProps {
  tierKey: Extract<SubscriptionTier, "personal" | "professional">;
  highlightedQuota: QuotaType;
}

function PlanCard({ tierKey, highlightedQuota }: PlanCardProps) {
  const tier = SUBSCRIPTION_TIERS[tierKey];
  const limits = tier.limits;
  const isPro = tierKey === "professional";

  // Show all five quota lines, with the one the user hit highlighted.
  const quotaOrder: QuotaType[] = [
    "posts",
    "brainstorms",
    "chat_messages",
    "image_generations",
    "scheduled_posts",
  ];

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col overflow-hidden rounded-xl border p-4 shadow-sm transition-all",
        isPro
          ? "border-purple-300/50 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-cyan-500/10 dark:border-purple-700/50 dark:from-purple-500/15 dark:via-blue-500/10 dark:to-cyan-500/15"
          : "border-blue-300/50 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-sky-500/10 dark:border-blue-700/50 dark:from-blue-500/15 dark:via-cyan-500/10 dark:to-sky-500/15"
      )}
    >
      {isPro && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
          <Sparkles className="size-3" aria-hidden />
          Best value
        </span>
      )}

      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-md text-white shadow-sm",
            isPro
              ? "bg-gradient-to-br from-purple-600 to-blue-600"
              : "bg-gradient-to-br from-blue-500 to-cyan-500"
          )}
        >
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{tier.label}</p>
          <p className="text-xs text-muted-foreground">{tier.price}</p>
        </div>
      </div>

      <ul className="mb-4 space-y-1.5 text-xs">
        {quotaOrder.map((qt) => {
          const isHighlighted = qt === highlightedQuota;
          return (
            <li
              key={qt}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1",
                isHighlighted
                  ? "bg-primary/15 ring-1 ring-primary/40 font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                {isHighlighted && (
                  <Zap
                    className="size-3 text-primary"
                    aria-label="The category you just hit"
                  />
                )}
                {QUOTA_LINE_LABELS[qt]}
              </span>
              <span className="tabular-nums">{formatLimit(limits[qt])}</span>
            </li>
          );
        })}
      </ul>

      <Link
        href="/pricing"
        className={cn(
          "mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2",
          isPro
            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus-visible:outline-purple-600"
            : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 focus-visible:outline-blue-600"
        )}
      >
        Upgrade to {tier.label}
        <ArrowRight className="size-3" aria-hidden />
      </Link>
    </div>
  );
}

function ByokCard() {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-cyan-500/10 p-4 shadow-sm dark:border-purple-700/50 dark:from-purple-500/15 dark:via-blue-500/10 dark:to-cyan-500/15">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm">
          <Key className="size-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">
            Bring your own AI key
          </p>
          <p className="text-xs text-muted-foreground">Unlimited usage</p>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Add your own AI provider key in Settings to bypass the system-key
        ceiling. PostPilot will use your key for every generation — no monthly
        cap.
      </p>

      <Link
        href="/settings"
        className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
      >
        Add API key
        <ArrowRight className="size-3" aria-hidden />
      </Link>
    </div>
  );
}

export function QuotaReachedModal() {
  const [body, setBody] = useState<QuotaExceededBody | null>(null);

  useEffect(() => {
    function onQuota(e: Event) {
      const detail = (e as CustomEvent<QuotaExceededBody>).detail;
      if (detail && detail.reason === "quota_exceeded") setBody(detail);
    }
    window.addEventListener(QUOTA_EXCEEDED_EVENT, onQuota);
    return () => window.removeEventListener(QUOTA_EXCEEDED_EVENT, onQuota);
  }, []);

  const open = body !== null;
  const featureLabel = body ? QUOTA_LABELS[body.quotaType as QuotaType] ?? "AI requests" : "";
  const tier = normalizeTier(body?.tier);
  const upgradePath = body?.upgradePath ?? "higher_tier";

  // Decide which plan cards to render.
  // Free → Personal + Professional. Personal → Professional only.
  // Pro+ never shows higher_tier path; only byok (handled separately).
  const planTiers: Array<"personal" | "professional"> =
    upgradePath === "higher_tier"
      ? tier === "free"
        ? ["personal", "professional"]
        : ["professional"]
      : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setBody(null);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto">
        {/*
          Hero image slot — swap the gradient block below for an <Image /> tag
          when art is ready. Aspect ratio reserved so the modal layout doesn't
          jump when you drop one in.
        */}
        <div
          aria-hidden
          className="relative -mx-6 -mt-6 mb-2 flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-cyan-500/20"
        >
          <Sparkles className="size-12 text-white/40" />
        </div>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {body
              ? `You've used all your ${featureLabel} this month`
              : "Quota reached"}
          </DialogTitle>
          <DialogDescription>
            {body && (
              <>
                You've hit{" "}
                <span className="font-semibold text-foreground">
                  {body.used}/{body.limit}
                </span>{" "}
                {featureLabel} on the{" "}
                <span className="font-semibold text-foreground capitalize">
                  {SUBSCRIPTION_TIERS[tier]?.label ?? tier}
                </span>{" "}
                plan.{" "}
                {upgradePath === "byok"
                  ? "Add your own AI key to keep going without limits."
                  : "Upgrade to keep creating — here's what unlocks:"}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {upgradePath === "byok" ? (
          <ByokCard />
        ) : (
          <div
            className={cn(
              "grid gap-3",
              planTiers.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"
            )}
          >
            {planTiers.map((t) => (
              <PlanCard
                key={t}
                tierKey={t}
                highlightedQuota={(body?.quotaType as QuotaType) ?? "posts"}
              />
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Quotas reset on the 1st of each month.
        </p>
      </DialogContent>
    </Dialog>
  );
}
