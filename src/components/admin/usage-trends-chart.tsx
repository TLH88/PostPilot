"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendPeriod = "week" | "month" | "quarter" | "year";

const PERIOD_OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: "week", label: "Week over Week" },
  { value: "month", label: "Month over Month" },
  { value: "quarter", label: "Quarter over Quarter" },
  { value: "year", label: "Year over Year" },
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

interface UsageTrendsChartProps {
  currentMetrics: {
    activeUsers: number;
    posts: number;
    brainstorms: number;
    aiMessages: number;
  };
}

export function UsageTrendsChart({ currentMetrics }: UsageTrendsChartProps) {
  const [period, setPeriod] = useState<TrendPeriod>("month");
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage/trends?period=${period}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.trends ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
      {/* Header with metrics */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold">This Month&apos;s Usage</h3>
          <Select value={period} onValueChange={(v) => setPeriod(v as TrendPeriod)}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue>
                {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {LINES.map((line) => (
            <div key={line.key} className="flex items-start gap-2">
              <div
                className="size-2.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: line.color }}
              />
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {currentMetrics[line.key as keyof typeof currentMetrics]}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  {line.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area with gradient dots background */}
      <div className="relative px-2 pb-4">
        {/* Gradient dots background — blue/purple/green blend */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Blue dots layer (left) */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
              maskImage: "linear-gradient(to right, black, transparent 60%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, black, transparent 60%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
          {/* Purple dots layer (center) */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle, #8b5cf6 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
              backgroundPosition: "8px 8px",
              maskImage: "linear-gradient(to right, transparent 20%, black 50%, transparent 80%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent 20%, black 50%, transparent 80%), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
          {/* Green dots layer (right) */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle, #22c55e 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
              maskImage: "linear-gradient(to right, transparent 40%, black), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent 40%, black), linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
        </div>

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
                dataKey="label"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={35}
                className="fill-muted-foreground"
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
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
            No trend data available yet. Usage data accumulates over time.
          </div>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-2">
            {LINES.map((line) => (
              <div key={line.key} className="flex items-center gap-1.5">
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                <span className="text-[10px] text-muted-foreground">{line.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
