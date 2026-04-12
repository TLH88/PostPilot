"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/admin/usage/kpi-card";
import { DateRangeSelect } from "@/components/admin/usage/date-range-select";
import { UsageNav } from "@/components/admin/usage/usage-nav";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "@/lib/admin/usage-queries";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const CHART_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

function formatUsd(v: number): string {
  return v < 0.01 && v > 0 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

interface DashboardData {
  summary: {
    totalSpend: number;
    totalRequests: number;
    avgCostPerRequest: number;
    activeUsers: number;
    mostExpensiveRoute: string | null;
    gatewayPct: number;
    cacheSavings: number;
    successRate: number;
    priorSpend: number;
    priorRequests: number;
  };
  timeSeries: Array<{ day: string; provider: string; cost: number; requests: number }>;
  topUsers: Array<{ userId: string; email?: string; fullName?: string; tier?: string; totalCost: number; totalRequests: number }>;
  routeCosts: Array<{ route: string; totalCost: number; requests: number; uniqueUsers: number }>;
}

export default function AdminUsagePage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage/summary?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepare daily cost chart data (stacked by provider)
  const dailyCostData = (() => {
    if (!data?.timeSeries?.length) return [];
    const dayMap: Record<string, Record<string, number>> = {};
    const providers = new Set<string>();
    for (const pt of data.timeSeries) {
      if (!dayMap[pt.day]) dayMap[pt.day] = {};
      dayMap[pt.day][pt.provider] = (dayMap[pt.day][pt.provider] ?? 0) + pt.cost;
      providers.add(pt.provider);
    }
    return Object.entries(dayMap)
      .map(([day, costs]) => ({ day: day.slice(5), ...costs })) // MM-DD for x-axis
      .sort((a, b) => a.day.localeCompare(b.day));
  })();

  const providers = data?.timeSeries
    ? [...new Set(data.timeSeries.map((t) => t.provider))]
    : [];

  const s = data?.summary;
  const spendChange = s ? pctChange(s.totalSpend, s.priorSpend) : null;
  const requestsChange = s ? pctChange(s.totalRequests, s.priorRequests) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">AI Usage</h1>
        </div>
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      {/* Sub-navigation */}
      <UsageNav />

      {/* Stale provider warning */}
      {s && s.successRate < 95 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 dark:border-red-900 dark:bg-red-950">
          <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">
            Overall success rate is {s.successRate.toFixed(1)}% (below 95%).{" "}
            <Link href="/admin/usage/reliability" className="underline font-medium">
              Check reliability details
            </Link>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground text-center py-20">
          No usage data available yet. Make some AI requests and check back.
        </p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Total Spend"
              value={formatUsd(s!.totalSpend)}
              trend={spendChange != null ? { value: spendChange, label: "vs prior" } : undefined}
            />
            <KpiCard
              label="Total Requests"
              value={s!.totalRequests.toLocaleString()}
              trend={requestsChange != null ? { value: requestsChange, label: "vs prior" } : undefined}
            />
            <KpiCard
              label="Avg Cost / Request"
              value={formatUsd(s!.avgCostPerRequest)}
            />
            <KpiCard
              label="Active Users"
              value={s!.activeUsers.toString()}
            />
            <KpiCard
              label="Top Route by Cost"
              value={s!.mostExpensiveRoute ?? "n/a"}
            />
            <KpiCard
              label="Gateway %"
              value={`${s!.gatewayPct.toFixed(0)}%`}
            />
            <KpiCard
              label="Cache Savings"
              value={formatUsd(s!.cacheSavings)}
            />
            <KpiCard
              label="Success Rate"
              value={`${s!.successRate.toFixed(1)}%`}
              alert={s!.successRate < 97}
            />
          </div>

          {/* Charts row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily cost line chart */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">Daily Cost by Provider</h3>
              {dailyCostData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyCostData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(v) => `$${v}`} width={65} />
                    <Tooltip formatter={(v) => formatUsd(Number(v ?? 0))} />
                    {providers.map((p, i) => (
                      <Line
                        key={p}
                        type="monotone"
                        dataKey={p}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-10">No data</p>
              )}
            </div>

            {/* Cost by route donut */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">Cost by Route</h3>
              {data.routeCosts.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.routeCosts}
                      dataKey="totalCost"
                      nameKey="route"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      label={(props) => {
                        const name = (props as { name?: string }).name ?? "";
                        const val = Number((props as { value?: number }).value ?? 0);
                        return `${name} ${formatUsd(val)}`;
                      }}
                    >
                      {data.routeCosts.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatUsd(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-10">No data</p>
              )}
            </div>
          </div>

          {/* Top users table */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Top Users by Cost</h3>
            </div>
            {data.topUsers.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tier</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Requests</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topUsers.map((user) => (
                    <tr
                      key={user.userId}
                      className="border-b last:border-0 hover:bg-hover-highlight cursor-pointer"
                    >
                      <td className="px-4 py-2">
                        <Link href={`/admin/usage/${user.userId}`} className="hover:underline">
                          <span className="font-medium">{user.fullName ?? user.email ?? user.userId.slice(0, 8)}</span>
                          {user.email && user.fullName && (
                            <span className="text-muted-foreground ml-1 text-xs">{user.email}</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {user.tier ?? "free"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">{user.totalRequests}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatUsd(user.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No users yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
