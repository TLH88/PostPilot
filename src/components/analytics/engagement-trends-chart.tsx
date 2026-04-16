"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartBackground } from "@/components/ui/chart-background";
import { DateRangeSelector, useDateRange } from "@/components/ui/date-range-selector";
import type { Post } from "@/types";

type ChartView = "engagement" | "impressions";

const ENGAGEMENT_LINES = [
  { key: "posts", label: "Posts", color: "#a855f7" },
  { key: "reactions", label: "Reactions", color: "#ef4444" },
  { key: "comments", label: "Comments", color: "#f59e0b" },
  { key: "reposts", label: "Reposts", color: "#22c55e" },
  { key: "engagementRate", label: "Engagement Rate %", color: "#10b981" },
] as const;

const IMPRESSION_LINES = [
  { key: "posts", label: "Posts", color: "#a855f7" },
  { key: "impressions", label: "Impressions", color: "#3b82f6" },
  { key: "reach", label: "Avg per Post", color: "#06b6d4" },
] as const;

type Aggregation = "day" | "week" | "month" | "quarter" | "year";

const AGGREGATION_OPTIONS: { value: Aggregation; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
];

interface EngagementTrendsChartProps {
  posts: Post[];
}

function getBucketKey(date: Date, agg: Aggregation): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  switch (agg) {
    case "day":
      return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    case "week": {
      const day = date.getDay();
      const monday = new Date(date);
      monday.setDate(d - ((day + 6) % 7));
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    }
    case "month":
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    case "quarter":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "year":
      return `${y}`;
  }
}

function formatBucketLabel(key: string, agg: Aggregation): string {
  switch (agg) {
    case "day": {
      const d = new Date(key + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    case "week": {
      const d = new Date(key + "T00:00:00");
      return `Wk ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    case "month": {
      const [y, mon] = key.split("-");
      const d = new Date(+y, +mon - 1);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    case "quarter":
      return key;
    case "year":
      return key;
  }
}

export function EngagementTrendsChart({ posts }: EngagementTrendsChartProps) {
  const [dateRange, setDateRange] = useDateRange("30d");
  const [aggregation, setAggregation] = useState<Aggregation>("week");
  const [chartView, setChartView] = useState<ChartView>("engagement");

  const activeLines = chartView === "engagement" ? ENGAGEMENT_LINES : IMPRESSION_LINES;

  // Filter posts: must have posted_at, must have analytics data, must be in date range
  const filteredPosts = useMemo(
    () =>
      posts
        .filter((p) => {
          if (!p.posted_at) return false;
          if (p.impressions == null && p.engagements == null) return false;
          const t = new Date(p.posted_at).getTime();
          return t >= dateRange.from.getTime() && t <= dateRange.to.getTime();
        })
        .sort(
          (a, b) =>
            new Date(a.posted_at!).getTime() - new Date(b.posted_at!).getTime()
        ),
    [posts, dateRange]
  );

  // Group into time buckets
  const data = useMemo(() => {
    const buckets = new Map<
      string,
      { posts: number; impressions: number; reactions: number; comments: number; reposts: number }
    >();

    for (const post of filteredPosts) {
      const date = new Date(post.posted_at!);
      const key = getBucketKey(date, aggregation);
      const bucket = buckets.get(key) ?? {
        posts: 0, impressions: 0, reactions: 0, comments: 0, reposts: 0,
      };
      bucket.posts += 1;
      bucket.impressions += post.impressions ?? 0;
      bucket.reactions += post.reactions ?? 0;
      bucket.comments += post.comments_count ?? 0;
      bucket.reposts += post.reposts ?? 0;
      buckets.set(key, bucket);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, bucket]) => {
        const totalEng = bucket.reactions + bucket.comments + bucket.reposts;
        const engRate =
          bucket.impressions > 0
            ? +((totalEng / bucket.impressions) * 100).toFixed(1)
            : 0;
        const reach = bucket.posts > 0 ? Math.round(bucket.impressions / bucket.posts) : 0;
        return {
          label: formatBucketLabel(key, aggregation),
          posts: bucket.posts,
          impressions: bucket.impressions,
          reactions: bucket.reactions,
          comments: bucket.comments,
          reposts: bucket.reposts,
          engagementRate: engRate,
          reach,
        };
      });
  }, [filteredPosts, aggregation]);

  // Compute filtered totals for the header metrics
  const filteredTotals = useMemo(() => {
    const count = filteredPosts.length;
    const impressions = filteredPosts.reduce((s, p) => s + (p.impressions ?? 0), 0);
    const reactions = filteredPosts.reduce((s, p) => s + (p.reactions ?? 0), 0);
    const comments = filteredPosts.reduce((s, p) => s + (p.comments_count ?? 0), 0);
    const reposts = filteredPosts.reduce((s, p) => s + (p.reposts ?? 0), 0);
    const engRate = impressions > 0 ? ((reactions + comments + reposts) / impressions * 100).toFixed(1) : "0.0";
    const avgPerPost = count > 0 ? Math.round(impressions / count) : 0;
    return { posts: count, impressions, reactions, comments, reposts, engRate, avgPerPost };
  }, [filteredPosts]);

  const engagementMetrics = [
    { value: filteredTotals.posts.toLocaleString() },
    { value: filteredTotals.reactions.toLocaleString() },
    { value: filteredTotals.comments.toLocaleString() },
    { value: filteredTotals.reposts.toLocaleString() },
    { value: `${filteredTotals.engRate}%` },
  ];

  const impressionMetrics = [
    { value: filteredTotals.posts.toLocaleString() },
    { value: filteredTotals.impressions.toLocaleString() },
    { value: filteredTotals.avgPerPost.toLocaleString() },
  ];

  const summaryMetrics = chartView === "engagement" ? engagementMetrics : impressionMetrics;
  const hasPercentAxis = chartView === "engagement";

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header with controls */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold">Post Trends</h3>
            {/* View toggle */}
            <div className="flex rounded-lg border border-input p-0.5 bg-muted/50">
              <button
                onClick={() => setChartView("engagement")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  chartView === "engagement"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Engagement
              </button>
              <button
                onClick={() => setChartView("impressions")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  chartView === "impressions"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Impressions
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as Aggregation)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {AGGREGATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metrics row */}
        <div className={`grid grid-cols-2 gap-6 ${chartView === "engagement" ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
          {activeLines.map((line, i) => (
            <div key={line.key} className="flex items-start gap-2">
              <div
                className="size-2.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: line.color }}
              />
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {summaryMetrics[i].value}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  {line.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative px-2 pb-4">
        <ChartBackground top={10} bottom={74} left={55} right={hasPercentAxis ? 30 : 20} />

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                {activeLines.map((line) => (
                  <linearGradient
                    key={line.key}
                    id={`grad-analytics-${line.key}`}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop offset="0%" stopColor={line.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={line.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label" fontSize={10} tickLine={false}
                axisLine={false} className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="left" fontSize={10} tickLine={false}
                axisLine={false} width={45} className="fill-muted-foreground"
              />
              {hasPercentAxis && (
                <YAxis
                  yAxisId="right" orientation="right" fontSize={10}
                  tickLine={false} axisLine={false} width={35}
                  tickFormatter={(v) => `${v}%`} className="fill-muted-foreground"
                />
              )}
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={((value: string | number, name: string) =>
                  name === "Engagement Rate %"
                    ? [`${value}%`, name]
                    : [Number(value).toLocaleString(), name]
                ) as never}
              />
              {activeLines.map((line) => (
                <Line
                  key={line.key}
                  yAxisId={line.key === "engagementRate" ? "right" : "left"}
                  type="monotone" dataKey={line.key} name={line.label}
                  stroke={line.color} strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-xs text-muted-foreground">
            {filteredPosts.length === 0 && posts.length > 0
              ? "No posts in the selected date range."
              : "Import analytics data to see post trends over time."}
          </div>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-2">
            {activeLines.map((line) => (
              <div key={line.key} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: line.color }} />
                <span className="text-[10px] text-muted-foreground">{line.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
