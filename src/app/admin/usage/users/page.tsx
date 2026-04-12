"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Loader2, Users, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeSelect } from "@/components/admin/usage/date-range-select";
import { UsageNav } from "@/components/admin/usage/usage-nav";
import { KpiCard } from "@/components/admin/usage/kpi-card";
import { TIER_BADGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/admin/usage-queries";
import { formatDistanceToNow } from "date-fns";

type SortField = "cost" | "requests" | "avg_cost" | "errors" | "cache_savings" | "name";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "cost", label: "Total Cost" },
  { value: "requests", label: "Total Requests" },
  { value: "avg_cost", label: "Avg Cost / Request" },
  { value: "errors", label: "Error Count" },
  { value: "cache_savings", label: "Cache Savings" },
  { value: "name", label: "Name (A-Z)" },
];

interface UserRow {
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
}

function formatUsd(v: number): string {
  return v < 0.01 && v > 0 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

export default function UsersPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("cost");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all users (limit=999 to get everyone)
      const res = await fetch(
        `/api/admin/usage/summary?range=${range}&userSort=${sortField}&userLimit=500`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setUsers(json.topUsers ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [range, sortField]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search filter
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.fullName ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.tier ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  // Client-side sort (the API already sorted, but this handles "name" sort and re-sorts after search)
  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
    if (sortField === "name") {
      list.sort((a, b) =>
        (a.fullName ?? a.email ?? "").localeCompare(b.fullName ?? b.email ?? "")
      );
    }
    return list;
  }, [filteredUsers, sortField]);

  // Aggregate stats
  const totalUsers = users.length;
  const totalCost = users.reduce((s, u) => s + u.totalCost, 0);
  const totalRequests = users.reduce((s, u) => s + u.totalRequests, 0);
  const totalErrors = users.reduce((s, u) => s + u.errorCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Users className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">User Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-9">
            Complete user-level AI usage data with search, sort, and drill-down.
          </p>
        </div>
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      <UsageNav />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Users" value={totalUsers.toString()} icon={Users} />
            <KpiCard label="Combined Spend" value={formatUsd(totalCost)} />
            <KpiCard label="Combined Requests" value={totalRequests.toLocaleString()} />
            <KpiCard
              label="Combined Errors"
              value={totalErrors.toString()}
              alert={totalErrors > 0}
            />
          </div>

          {/* Search + sort */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or tier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Sort by:</span>
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue>
                    {SORT_OPTIONS.find((o) => o.value === sortField)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Full users table */}
          <div className="rounded-xl border bg-card">
            {sortedUsers.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Tier
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Requests
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Avg / Req
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Errors
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Cache Saved
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Last Active
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((user) => {
                        const initials = (user.fullName ?? user.email ?? "?")
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);

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
                            <td className="px-4 py-3">
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
                            <td className="px-4 py-3 text-right tabular-nums">
                              {user.totalRequests}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {formatUsd(user.totalCost)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {formatUsd(user.avgCostPerRequest)}
                            </td>
                            <td className={cn(
                              "px-4 py-3 text-right tabular-nums",
                              user.errorCount > 0 && "text-red-600 dark:text-red-400 font-medium"
                            )}>
                              {user.errorCount}
                              {user.errorCount > 0 && (
                                <span className="text-[10px] ml-1">
                                  ({user.errorRate.toFixed(1)}%)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {formatUsd(user.cacheSavings)}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {user.lastActive
                                ? formatDistanceToNow(new Date(user.lastActive), {
                                    addSuffix: true,
                                  })
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t text-center">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    {search
                      ? `${sortedUsers.length} of ${users.length} users matching "${search}"`
                      : `Showing all ${sortedUsers.length} users`}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-xs text-muted-foreground">
                {search ? "No users match your search" : "No usage data yet"}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
