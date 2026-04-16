"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { ChartBackground } from "@/components/ui/chart-background";
import { DateRangeSelector, useDateRange } from "@/components/ui/date-range-selector";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendPeriod = "day" | "week" | "month" | "quarter" | "year";

const PERIOD_OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
];

interface TrendPoint {
  label: string;
  activeUsers: number;
  posts: number;
  brainstorms: number;
  aiMessages: number;
}

const LINES = [
  { key: "activeUsers", label: "Active Users", color: "#6366f1" },
  { key: "posts", label: "Posts", color: "#22c55e" },
  { key: "brainstorms", label: "Brainstorms", color: "#f59e0b" },
  { key: "aiMessages", label: "AI Messages", color: "#06b6d4" },
] as const;

export function UsageTrendsChart() {
  const [period, setPeriod] = useState<TrendPeriod>("week");
  const [dateRange, setDateRange] = useDateRange("30d");
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (dateRange.preset !== "all") {
        params.set("from", dateRange.from.toISOString());
        params.set("to", dateRange.to.toISOString());
      }
      const res = await fetch(`/api/admin/usage/trends?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.trends ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute filtered totals from chart data
  const filteredTotals = useMemo(() => {
    const activeUsers = Math.max(...data.map((d) => d.activeUsers), 0);
    const posts = data.reduce((s, d) => s + d.posts, 0);
    const brainstorms = data.reduce((s, d) => s + d.brainstorms, 0);
    const aiMessages = data.reduce((s, d) => s + d.aiMessages, 0);
    return { activeUsers, posts, brainstorms, aiMessages };
  }, [data]);

  const summaryMetrics = [
    { key: "activeUsers", value: filteredTotals.activeUsers.toLocaleString() },
    { key: "posts", value: filteredTotals.posts.toLocaleString() },
    { key: "brainstorms", value: filteredTotals.brainstorms.toLocaleString() },
    { key: "aiMessages", value: filteredTotals.aiMessages.toLocaleString() },
  ];

  return (
    <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
      {/* Header with controls */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h3 className="text-base font-semibold">Usage Trends</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TrendPeriod)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {LINES.map((line, i) => (
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
        <ChartBackground top={10} bottom={74} left={55} right={30} />

        {loading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <defs>
                {LINES.map((line) => (
                  <linearGradient key={line.key} id={`grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
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
                fontSize={10} tickLine={false} axisLine={false}
                width={35} className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              {LINES.map((line) => (
                <Line
                  key={line.key} type="monotone" dataKey={line.key}
                  name={line.label} stroke={line.color} strokeWidth={2.5}
                  dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
            No trend data available for this date range.
          </div>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-2">
            {LINES.map((line) => (
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
