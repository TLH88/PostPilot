"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_TIERS, TIER_BADGE_COLORS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SignupUser {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  subscription_tier: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentSignupsTable({ users }: { users: SignupUser[] }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const DEFAULT_COUNT = 10;
  const PAGE_SIZE = 25;
  const total = users.length;
  const visible = expanded
    ? users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : users.slice(0, DEFAULT_COUNT);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tier</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((u) => {
            const name = u.full_name ?? u.email?.split("@")[0] ?? "Unknown";
            const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
            const tier = (u.subscription_tier ?? "free") as SubscriptionTier;

            return (
              <tr key={u.id} className="border-b last:border-0 hover:bg-hover-highlight transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-xs">{u.full_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className={cn("text-[9px] uppercase font-semibold tracking-wider", TIER_BADGE_COLORS[tier])}>
                    {SUBSCRIPTION_TIERS[tier]?.label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {timeAgo(u.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {total > DEFAULT_COUNT && (
        <div className="px-5 py-2 border-t">
          {!expanded ? (
            <button
              onClick={() => { setExpanded(true); setPage(0); }}
              className="w-full text-center text-xs font-medium text-primary hover:underline"
            >
              View All ({total})
            </button>
          ) : (
            <div className="space-y-2">
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    Previous
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    Next
                  </button>
                </div>
              )}
              <button
                onClick={() => { setExpanded(false); setPage(0); }}
                className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Show Less
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
