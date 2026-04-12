"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Loader2,
  DollarSign,
  Zap,
  TrendingUp,
  Users,
  Route,
  Shield,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { KpiCard } from "@/components/admin/usage/kpi-card";
import { DateRangeSelect } from "@/components/admin/usage/date-range-select";
import { UsageNav } from "@/components/admin/usage/usage-nav";
import { ChartBackground } from "@/components/ui/chart-background";
import { Badge } from "@/components/ui/badge";
import { TIER_BADGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/admin/usage-queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  topUsers: Array<{
    userId: string;
    email?: string;
    fullName?: string;
    tier?: string;
    totalCost: number;
    totalRequests: number;
    avgCostPerRequest: number;
    errorCount: number;
    errorRate: number;
    cacheSavings: number;
    lastActive?: string;
  }>;
  routeCosts: Array<{ route: string; totalCost: number; requests: number; uniqueUsers: number }>;
}

type UserSortMetric = "cost" | "requests" | "avg_cost" | "errors" | "cache_savings";

const USER_SORT_OPTIONS: { value: UserSortMetric; label: string }[] = [
  { value: "cost", label: "Total Cost" },
  { value: "requests", label: "Total Requests" },
  { value: "avg_cost", label: "Avg Cost / Request" },
  { value: "errors", label: "Error Count" },
  { value: "cache_savings", label: "Cache Savings" },
];

export default function AdminUsagePage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [userSort, setUserSort] = useState<UserSortMetric>("cost");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage/summary?range=${range}&userSort=${userSort}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [range, userSort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepare daily cost chart data (stacked by provider)
  const dailyCostData = (() => {
    if (!data?.timeSeries?.length) return [];
    const dayMap: Record<string, Record<string, number>> = {};
    for (const pt of data.timeSeries) {
      if (!dayMap[pt.day]) dayMap[pt.day] = {};
      dayMap[pt.day][pt.provider] = (dayMap[pt.day][pt.provider] ?? 0) + pt.cost;
    }
    return Object.entries(dayMap)
      .map(([day, costs]) => ({ day: day.slice(5), ...costs }))
      .sort((a, b) => a.day.localeCompare(b.day));
  })();

  const providers = data?.timeSeries
    ? [...new Set(data.timeSeries.map((t) => t.provider))]
    : [];

  const s = data?.summary;
  const spendChange = s ? pctChange(s.totalSpend, s.priorSpend) : null;
  const requestsChange = s ? pctChange(s.totalRequests, s.priorRequests) : null;

  // Donut: compute top route percentage for center label
  const totalRouteCost = data?.routeCosts?.reduce((sum, r) => sum + r.totalCost, 0) ?? 0;
  const topRoute = data?.routeCosts?.[0];
  const topRoutePct = topRoute && totalRouteCost > 0
    ? Math.round((topRoute.totalCost / totalRouteCost) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">AI Usage Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-9">
            Monitor AI spend, provider performance, and usage patterns across your platform.
          </p>
        </div>
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      {/* Sub-navigation */}
      <UsageNav />

      {/* Stale provider warning */}
      {s && s.successRate < 95 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
          <AlertTriangle className="size-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">
            Overall success rate is {s.successRate.toFixed(1)}% (below 95%).{" "}
            <Link href="/admin/usage/reliability" className="underline font-medium">
              Check reliability details
            </Link>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Activity className="size-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No usage data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Make some AI requests and check back to see your dashboard populate.
          </p>
        </div>
      ) : (
        <>
          {/* KPI cards — row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Spend"
              value={formatUsd(s!.totalSpend)}
              icon={DollarSign}
              trend={spendChange != null ? { value: spendChange, label: "from prior period" } : undefined}
            />
            <KpiCard
              label="Total Requests"
              value={s!.totalRequests.toLocaleString()}
              icon={Zap}
              trend={requestsChange != null ? { value: requestsChange, label: "from prior period" } : undefined}
              subtitle={`Monthly quota: ${s!.totalRequests.toLocaleString()}`}
              subtitleColor="muted"
            />
            <KpiCard
              label="Avg Cost / Request"
              value={formatUsd(s!.avgCostPerRequest)}
              icon={TrendingUp}
              subtitle="Efficient routing active"
              subtitleColor="muted"
            />
            <KpiCard
              label="Active Users"
              value={s!.activeUsers.toString()}
              icon={Users}
              subtitle={s!.activeUsers > 0 ? "Currently active" : "No activity"}
              subtitleColor={s!.activeUsers > 0 ? "green" : "muted"}
            />
          </div>

          {/* KPI cards — row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Top Route by Cost"
              value={s!.mostExpensiveRoute ?? "n/a"}
              icon={Route}
            />
            <KpiCard
              label="Gateway %"
              value={`${s!.gatewayPct.toFixed(0)}%`}
              icon={Shield}
              subtitle={s!.gatewayPct === 100 ? "Fully protected" : `${(100 - s!.gatewayPct).toFixed(0)}% direct`}
              subtitleColor={s!.gatewayPct >= 90 ? "green" : "amber"}
            />
            <KpiCard
              label="Cache Savings"
              value={formatUsd(s!.cacheSavings)}
              icon={Sparkles}
              subtitle={s!.cacheSavings > 0 ? "Prompt caching active" : "0% semantic hits"}
              subtitleColor={s!.cacheSavings > 0 ? "green" : "muted"}
            />
            <KpiCard
              label="Success Rate"
              value={`${s!.successRate.toFixed(1)}%`}
              icon={CheckCircle}
              alert={s!.successRate < 97}
              subtitle={s!.successRate >= 99.5 ? "Perfect health score" : s!.successRate >= 97 ? "Healthy" : "Degraded"}
              subtitleColor={s!.successRate >= 99.5 ? "green" : s!.successRate >= 97 ? "green" : "red"}
            />
          </div>

          {/* Charts row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily cost line chart */}
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-base font-semibold">Daily Cost by Provider</h3>
                  <p className="text-xs text-muted-foreground">
                    Breakdown of expenditure across LLM providers
                  </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {providers.map((p, i) => (
                    <div key={p} className="flex items-center gap-1.5">
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-[11px] text-muted-foreground capitalize">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              {dailyCostData.length > 0 ? (
                <div className="relative">
                  <ChartBackground top={20} bottom={25} left={75} right={10} />
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dailyCostData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickFormatter={(v) => `$${v}`} width={65} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(v) => formatUsd(Number(v ?? 0))}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--card)",
                          fontSize: "12px",
                        }}
                      />
                      {providers.map((p, i) => (
                        <Line
                          key={p}
                          type="monotone"
                          dataKey={p}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-xs text-muted-foreground">
                  No data for this period
                </div>
              )}
            </div>

            {/* Cost by route donut */}
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-1">
                <h3 className="text-base font-semibold">Cost by Route</h3>
                <p className="text-xs text-muted-foreground">Total usage distribution</p>
              </div>
              {data.routeCosts.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <ResponsiveContainer width={220} height={220}>
                      <PieChart>
                        <Pie
                          data={data.routeCosts}
                          dataKey="totalCost"
                          nameKey="route"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={65}
                          strokeWidth={2}
                          stroke="var(--card)"
                        >
                          {data.routeCosts.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold">{topRoutePct}%</span>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {topRoute?.route ?? ""}
                      </span>
                    </div>
                  </div>
                  {/* Legend below donut */}
                  <div className="mt-2 space-y-1.5 w-full max-w-xs">
                    {data.routeCosts.map((r, i) => {
                      const pct = totalRouteCost > 0 ? (r.totalCost / totalRouteCost) * 100 : 0;
                      return (
                        <div key={r.route} className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="text-xs font-medium">{r.route}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold">{pct.toFixed(0)}%</span>
                            <span className="text-[10px] text-muted-foreground w-16 text-right">
                              {formatUsd(r.totalCost)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-xs text-muted-foreground">
                  No data for this period
                </div>
              )}
            </div>
          </div>

          {/* Top users table */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-base font-semibold">Top Users</h3>
                <p className="text-xs text-muted-foreground">
                  Top 20 users ranked by selected metric
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Sort by:</span>
                <Select value={userSort} onValueChange={(v) => setUserSort(v as UserSortMetric)}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue>
                      {USER_SORT_OPTIONS.find((o) => o.value === userSort)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {USER_SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {data.topUsers.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {userSort === "avg_cost"
                          ? "Avg / Req"
                          : userSort === "errors"
                            ? "Errors"
                            : userSort === "cache_savings"
                              ? "Saved"
                              : "Avg / Req"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((user) => {
                      const initials = (user.fullName ?? user.email ?? "?")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      // Dynamic 5th column based on sort
                      let metricValue: string;
                      let metricAlert = false;
                      if (userSort === "errors") {
                        metricValue = `${user.errorCount} (${user.errorRate.toFixed(1)}%)`;
                        metricAlert = user.errorCount > 0;
                      } else if (userSort === "cache_savings") {
                        metricValue = formatUsd(user.cacheSavings);
                      } else {
                        metricValue = formatUsd(user.avgCostPerRequest);
                      }

                      return (
                        <tr
                          key={user.userId}
                          className="border-b last:border-0 hover:bg-hover-highlight transition-colors"
                        >
                          <td className="px-5 py-3">
                            <Link
                              href={`/admin/usage/${user.userId}`}
                              className="flex items-center gap-3 hover:underline"
                            >
                              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {user.fullName ?? user.email ?? user.userId.slice(0, 8)}
                                </p>
                                {user.email && user.fullName && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="px-5 py-3">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] uppercase font-semibold tracking-wider",
                                TIER_BADGE_COLORS[user.tier ?? "free"] ?? ""
                              )}
                            >
                              {user.tier ?? "free"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            {user.totalRequests}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums">
                            {formatUsd(user.totalCost)}
                          </td>
                          <td className={cn(
                            "px-5 py-3 text-right tabular-nums",
                            metricAlert && "text-red-600 dark:text-red-400 font-medium"
                          )}>
                            {metricValue}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    Showing 1 to {data.topUsers.length} of {data.topUsers.length} users
                  </p>
                  <Link
                    href="/admin/usage/users"
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    View all users &rarr;
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                No users yet
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
