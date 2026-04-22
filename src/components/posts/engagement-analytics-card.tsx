"use client";

import { Eye, Heart, MessageCircle, Repeat2, MousePointerClick } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/types";

const METRICS = [
  { key: "impressions" as const, label: "Impressions", icon: Eye, color: "text-blue-500" },
  { key: "reactions" as const, label: "Reactions", icon: Heart, color: "text-red-500" },
  { key: "comments_count" as const, label: "Comments", icon: MessageCircle, color: "text-amber-500" },
  { key: "reposts" as const, label: "Reposts", icon: Repeat2, color: "text-green-500" },
  { key: "engagements" as const, label: "Engagements", icon: MousePointerClick, color: "text-purple-500" },
];

type MetricKey = (typeof METRICS)[number]["key"];

interface EngagementAnalyticsCardProps {
  post: Post;
  onUpdate: (key: MetricKey, value: number | null) => void;
  refreshButton?: React.ReactNode;
}

export function EngagementAnalyticsCard({ post, onUpdate, refreshButton }: EngagementAnalyticsCardProps) {
  const supabase = createClient();

  async function handleBlur(key: MetricKey, rawValue: string) {
    const val = rawValue === "" ? null : parseInt(rawValue, 10);
    onUpdate(key, val);
    await supabase
      .from("posts")
      .update({ [key]: val, updated_at: new Date().toISOString() })
      .eq("id", post.id);
  }

  // BP-092: Clear data-source indicator so users can tell at a glance
  // whether these numbers came from LinkedIn or were entered by hand.
  const hasAnyMetric =
    (post.impressions ?? 0) > 0 ||
    (post.reactions ?? 0) > 0 ||
    (post.comments_count ?? 0) > 0 ||
    (post.reposts ?? 0) > 0 ||
    (post.engagements ?? 0) > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Eye className="size-4 text-primary" />
          Engagement Analytics
        </div>
        {post.analytics_fetched_at ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 px-2 py-0.5 text-[10px] font-medium">
            Synced from LinkedIn · {new Date(post.analytics_fetched_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
            {new Date(post.analytics_fetched_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
        ) : hasAnyMetric ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
            Manually entered
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {METRICS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="rounded-lg border bg-background p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Icon className={`size-3.5 ${color}`} />
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</label>
            </div>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-lg font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
              value={post[key] ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                onUpdate(key, val);
              }}
              onBlur={(e) => handleBlur(key, e.target.value)}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      {/* Engagement rate calculation */}
      {post.impressions && post.impressions > 0 && post.engagements != null && (
        <div className="text-xs text-muted-foreground">
          Engagement rate: <span className="font-medium text-foreground">{((post.engagements / post.impressions) * 100).toFixed(1)}%</span>
        </div>
      )}

      {refreshButton}
    </div>
  );
}
