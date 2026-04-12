"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Layers } from "lucide-react";
import { DateRangeSelect } from "@/components/admin/usage/date-range-select";
import { KpiCard } from "@/components/admin/usage/kpi-card";
import { UsageNav } from "@/components/admin/usage/usage-nav";
import type { DateRange } from "@/lib/admin/usage-queries";

interface RouteRow {
  route: string;
  totalCost: number;
  requests: number;
  uniqueUsers: number;
}

function formatUsd(v: number): string {
  return v < 0.01 && v > 0 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

export default function FeaturesPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage/features?range=${range}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRoutes(json.routeCosts);
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalCost = routes.reduce((s, r) => s + r.totalCost, 0);
  const mostEfficient = routes.length > 0
    ? routes.reduce((best, r) => {
        const cpr = r.requests > 0 ? r.totalCost / r.requests : Infinity;
        const bestCpr = best.requests > 0 ? best.totalCost / best.requests : Infinity;
        return cpr < bestCpr ? r : best;
      })
    : null;
  const costSink = routes.length > 0
    ? routes.reduce((worst, r) => {
        const cpr = r.requests > 0 ? r.totalCost / r.requests : 0;
        const worstCpr = worst.requests > 0 ? worst.totalCost / worst.requests : 0;
        return cpr > worstCpr ? r : worst;
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="size-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Feature Cost Analysis</h1>
      </div>

      <div className="flex items-center justify-between gap-4">
        <UsageNav />
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Total AI Spend" value={formatUsd(totalCost)} />
            {mostEfficient && (
              <KpiCard
                label="Most Cost-Effective"
                value={mostEfficient.route}
                trend={{ value: 0, label: formatUsd(mostEfficient.requests > 0 ? mostEfficient.totalCost / mostEfficient.requests : 0) + "/req" }}
              />
            )}
            {costSink && costSink.route !== mostEfficient?.route && (
              <KpiCard
                label="Highest Cost/Request"
                value={costSink.route}
                trend={{ value: 0, label: formatUsd(costSink.requests > 0 ? costSink.totalCost / costSink.requests : 0) + "/req" }}
                alert
              />
            )}
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Cost per AI Feature</h3>
              <p className="text-xs text-muted-foreground">Breakdown of spend, usage, and efficiency by route</p>
            </div>
            {routes.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Route</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Spend</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Requests</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Users</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cost / Request</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => {
                    const cpr = r.requests > 0 ? r.totalCost / r.requests : 0;
                    const pct = totalCost > 0 ? (r.totalCost / totalCost) * 100 : 0;
                    return (
                      <tr key={r.route} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{r.route}</td>
                        <td className="px-4 py-2 text-right">{formatUsd(r.totalCost)}</td>
                        <td className="px-4 py-2 text-right">{r.requests.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{r.uniqueUsers}</td>
                        <td className="px-4 py-2 text-right">{formatUsd(cpr)}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No data</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
