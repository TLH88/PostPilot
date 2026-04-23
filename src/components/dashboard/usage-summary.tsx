"use client";

import { useState, useEffect } from "react";
import { Gauge, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUBSCRIPTION_TIERS, TIER_BADGE_COLORS, type QuotaType } from "@/lib/constants";
import { cn } from "@/lib/utils";

const QUOTA_LABELS: Record<QuotaType, string> = {
  posts: "Posts",
  brainstorms: "Brainstorms",
  chat_messages: "AI Messages",
  scheduled_posts: "Scheduled",
};

interface UsageData {
  used: number;
  limit: number;
}

export function UsageSummary() {
  const [usage, setUsage] = useState<Record<QuotaType, UsageData> | null>(null);
  const [tier, setTier] = useState<string>("free");

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then((data) => {
        setTier(data.tier);
        setUsage({
          posts: data.posts,
          brainstorms: data.brainstorms,
          chat_messages: data.chat_messages,
          scheduled_posts: data.scheduled_posts,
        });
      })
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Gauge className="size-4 text-primary" />
            Monthly Usage
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="About Monthly Usage" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-sm">
                  How much of your plan you&apos;ve used this month across posts, brainstorms, AI chat, and scheduling. Resets at the start of each billing cycle.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          <Badge variant="secondary" className={cn("text-[10px]", TIER_BADGE_COLORS[tier] ?? TIER_BADGE_COLORS.free)}>
            {tierConfig?.label ?? "Free"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.entries(QUOTA_LABELS) as [QuotaType, string][]).map(([key, label]) => {
          const u = usage[key];
          if (!u) return null;
          const isUnlimited = u.limit === -1;
          const pct = isUnlimited ? 0 : u.limit > 0 ? Math.min((u.used / u.limit) * 100, 100) : 0;
          const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary";

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">
                  {u.used}{isUnlimited ? "" : ` / ${u.limit}`}
                </span>
              </div>
              {!isUnlimited ? (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", barColor)}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Unlimited</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
