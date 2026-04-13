"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DateRangeSelect } from "@/components/admin/usage/date-range-select";
import { KpiCard } from "@/components/admin/usage/kpi-card";
import { UsageNav } from "@/components/admin/usage/usage-nav";
import type { DateRange } from "@/lib/admin/usage-queries";

interface ProviderRow {
  provider: string;
  totalRequests: number;
  failures: number;
  successRate: number;
  avgLatencyMs: number;
  topErrorCode: string | null;
}

export default function ReliabilityPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage/reliability?range=${range}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setProviders(json.providers);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRequests = providers.reduce((s, p) => s + p.totalRequests, 0);
  const totalFailures = providers.reduce((s, p) => s + p.failures, 0);
  const overallSuccess = totalRequests > 0 ? ((totalRequests - totalFailures) / totalRequests) * 100 : 100;
  const avgLatency = providers.length > 0
    ? Math.round(providers.reduce((s, p) => s + p.avgLatencyMs * p.totalRequests, 0) / Math.max(totalRequests, 1))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Provider Reliability</h1>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Requests" value={totalRequests.toLocaleString()} />
            <KpiCard label="Total Failures" value={totalFailures.toLocaleString()} alert={totalFailures > 0} />
            <KpiCard label="Overall Uptime" value={`${overallSuccess.toFixed(1)}%`} alert={overallSuccess < 95} />
            <KpiCard label="Avg Latency" value={`${avgLatency}ms`} />
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Provider Breakdown</h3>
            </div>
            {providers.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Provider</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Requests</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Failures</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Success Rate</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Avg Latency</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Top Error</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.provider} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium capitalize">{p.provider}</td>
                      <td className="px-4 py-2 text-right">{p.totalRequests}</td>
                      <td className="px-4 py-2 text-right">
                        {p.failures > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">{p.failures}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={p.successRate < 95 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                          {p.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{p.avgLatencyMs}ms</td>
                      <td className="px-4 py-2">
                        {p.topErrorCode ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {p.topErrorCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
