"use client";

import { useState, useEffect } from "react";
import { Check, Crown, Loader2, Sparkles, User, Building2, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_TIERS, type SubscriptionTier, type QuotaType } from "@/lib/constants";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<
  SubscriptionTier,
  { icon: typeof User; color: string; borderColor: string; bgColor: string }
> = {
  free: {
    icon: User,
    color: "text-gray-500",
    borderColor: "border-l-gray-400",
    bgColor: "bg-gray-500/10",
  },
  personal: {
    icon: Sparkles,
    color: "text-blue-500",
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-500/10",
  },
  professional: {
    icon: Crown,
    color: "text-amber-500",
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-500/10",
  },
  team: {
    icon: Building2,
    color: "text-green-500",
    borderColor: "border-l-green-500",
    bgColor: "bg-green-500/10",
  },
  enterprise: {
    icon: Shield,
    color: "text-amber-600",
    borderColor: "border-l-amber-600",
    bgColor: "bg-amber-600/10",
  },
};

function formatLimit(limit: number): string {
  return limit === -1 ? "Unlimited" : String(limit);
}

const QUOTA_LABELS: Record<QuotaType, string> = {
  posts: "Posts / month",
  brainstorms: "Brainstorms / month",
  chat_messages: "AI messages / month",
  scheduled_posts: "Scheduled posts",
  image_generations: "AI image generations / month",
};

interface SubscriptionTierProps {
  currentTier: SubscriptionTier;
}

export function SubscriptionTierSetting({ currentTier }: SubscriptionTierProps) {
  const [tier, setTier] = useState<SubscriptionTier>(currentTier);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<Record<string, { used: number; limit: number }> | null>(null);
  const [trialInfo, setTrialInfo] = useState<{ trialTier: string; daysLeft: number; trialEndsAt: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then((data) => {
        setUsage({
          posts: data.posts,
          brainstorms: data.brainstorms,
          chat_messages: data.chat_messages,
          scheduled_posts: data.scheduled_posts,
        });
      })
      .catch(() => {});

    // Check trial status
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_profiles")
        .select("account_status, trial_tier, trial_ends_at")
        .eq("user_id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.account_status === "trial" && profile.trial_tier && profile.trial_ends_at) {
            const daysLeft = Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000));
            setTrialInfo({ trialTier: profile.trial_tier, daysLeft, trialEndsAt: profile.trial_ends_at });
          }
        });
    });
  }, [tier]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTierChange(newTier: SubscriptionTier) {
    if (newTier === tier) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ subscription_tier: newTier, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update plan.");
    } else {
      setTier(newTier);
      toast.success(`Switched to ${SUBSCRIPTION_TIERS[newTier].label} plan.`);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {trialInfo && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
          <Clock className="size-4 shrink-0" />
          <span className="flex-1">
            Your {trialInfo.trialTier.charAt(0).toUpperCase() + trialInfo.trialTier.slice(1)} trial ends in{" "}
            <strong>{trialInfo.daysLeft} day{trialInfo.daysLeft !== 1 ? "s" : ""}</strong>
            {" "}({new Date(trialInfo.trialEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}).
          </span>
          <Link href="/pricing" className="shrink-0 text-xs font-medium text-primary hover:underline">
            Upgrade
          </Link>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Select your plan to set usage limits. This is a temporary selector — Stripe billing will replace this.
      </p>

      {/* Tier cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, (typeof SUBSCRIPTION_TIERS)[SubscriptionTier]][]).map(
          ([key, tierDef]) => {
            const config = TIER_CONFIG[key];
            const Icon = config.icon;
            const isActive = tier === key;

            return (
              <button
                key={key}
                type="button"
                disabled={saving}
                onClick={() => handleTierChange(key)}
                className={cn(
                  "relative rounded-lg border-2 border-l-4 p-3 text-left transition-colors",
                  config.borderColor,
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-hover-highlight"
                )}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Check className="size-4 text-primary" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("flex size-7 items-center justify-center rounded-full", config.bgColor)}>
                    <Icon className={cn("size-3.5", config.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tierDef.label}</p>
                    <p className="text-xs text-muted-foreground">{tierDef.price}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {(Object.entries(tierDef.limits) as [QuotaType, number][]).map(([quotaKey, limit]) => (
                    <div key={quotaKey} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{QUOTA_LABELS[quotaKey]}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {formatLimit(limit)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </button>
            );
          }
        )}
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Updating plan...
        </div>
      )}

      {/* Current usage */}
      {usage && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Current Month Usage
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(QUOTA_LABELS) as [QuotaType, string][]).map(([key, label]) => {
              const u = usage[key];
              if (!u) return null;
              const isUnlimited = u.limit === -1;
              const pct = isUnlimited ? 0 : u.limit > 0 ? Math.min((u.used / u.limit) * 100, 100) : 0;
              const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary";

              return (
                <div key={key} className="rounded-md border p-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium tabular-nums">
                      {u.used}{isUnlimited ? "" : ` / ${u.limit}`}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  )}
                  {isUnlimited && (
                    <p className="text-[10px] text-muted-foreground">Unlimited</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
