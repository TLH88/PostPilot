"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DateRangeSelect } from "@/components/admin/usage/date-range-select";
import { KpiCard } from "@/components/admin/usage/kpi-card";
import { TIER_BADGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/admin/usage-queries";
import { formatDistanceToNow } from "date-fns";

interface UserDetail {
  userId: string;
  email?: string;
  fullName?: string;
  tier?: string;
  totalCost: number;
  totalRequests: number;
  cacheSavings: number;
  topRoute: string | null;
  topProvider: string | null;
  recentEvents: Array<{
    id: string;
    route: string;
    provider: string;
    model: string;
    source: string;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
    success: boolean;
    errorCode: string | null;
    latencyMs: number | null;
    createdAt: string;
  }>;
}

function formatUsd(v: number): string {
  return v < 0.01 && v > 0 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

export default function UserDrilldownPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const [range, setRange] = useState<DateRange>("30d");
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/usage/user?userId=${userId}&range=${range}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/usage"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <User className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {data?.fullName ?? data?.email ?? userId.slice(0, 8)}
            </h1>
            {data?.email && data?.fullName && (
              <p className="text-xs text-muted-foreground">{data.email}</p>
            )}
          </div>
          {data?.tier && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px]",
                TIER_BADGE_COLORS[data.tier] ?? ""
              )}
            >
              {data.tier}
            </Badge>
          )}
        </div>
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground text-center py-20">
          User not found or no usage data.
        </p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCard label="Total Cost" value={formatUsd(data.totalCost)} />
            <KpiCard
              label="Total Requests"
              value={data.totalRequests.toString()}
            />
            <KpiCard
              label="Cache Savings"
              value={formatUsd(data.cacheSavings)}
            />
            <KpiCard
              label="Top Route"
              value={data.topRoute ?? "n/a"}
            />
            <KpiCard
              label="Top Provider"
              value={data.topProvider ?? "n/a"}
            />
          </div>

          {/* Request history table */}
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Request History</h3>
              <p className="text-xs text-muted-foreground">
                Most recent AI requests for this user
              </p>
            </div>
            {data.recentEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Route
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Provider / Model
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Source
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Tokens
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Cost
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Latency
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        When
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEvents.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b last:border-0 text-xs"
                      >
                        <td className="px-3 py-2 font-medium">{e.route}</td>
                        <td className="px-3 py-2">
                          <span className="capitalize">{e.provider}</span>
                          <span className="text-muted-foreground ml-1">
                            / {e.model}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="secondary"
                            className="text-[9px]"
                          >
                            {e.source}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {e.inputTokens != null
                            ? `${e.inputTokens}/${e.outputTokens ?? 0}`
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {e.costUsd != null ? formatUsd(e.costUsd) : "-"}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {e.latencyMs != null ? `${e.latencyMs}ms` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {e.success ? (
                            <span className="text-green-600 dark:text-green-400">
                              OK
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">
                              {e.errorCode ?? "Error"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <span title={e.createdAt}>
                            {formatDistanceToNow(new Date(e.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">
                No requests in this period
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
