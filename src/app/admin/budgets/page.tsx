"use client";

/**
 * BP-085 Phase 3 — Admin → Budgets.
 *
 * Lists every user with: current-month $ spend, threshold ($), paused
 * state, and last-alert summary. Lets the admin set/clear thresholds,
 * pause/unpause, and view the alert log per user.
 *
 * All mutations go through admin API routes (BP-142 wizard-via-API
 * pattern). No direct Supabase REST writes from the client.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, DollarSign, AlertTriangle, Pause, Play, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TIER_BADGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AdminBudgetRow } from "@/app/admin/budgets/types";

interface AlertRow {
  id: string;
  alert_type: string;
  threshold_usd: number | null;
  actual_usd: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

function fmtUsd(v: number): string {
  if (v === 0) return "$0.00";
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminBudgetsPage() {
  const [rows, setRows] = useState<AdminBudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "managed" | "paused" | "team">("all");

  // Edit-threshold modal
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState<string>("");
  const [editBurn, setEditBurn] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Alerts modal
  const [alertsUserId, setAlertsUserId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/budgets");
      if (!res.ok) throw new Error("Failed to load budgets");
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "managed" && r.monthlyUsdLimit == null && !r.isPaused) return false;
      if (filter === "paused" && !r.isPaused) return false;
      if (filter === "team" && r.tier !== "team" && r.tier !== "enterprise") return false;
      if (!q) return true;
      return (
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.fullName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const totalBillable = useMemo(
    () => rows.reduce((sum, r) => sum + (r.currentMonthBillableUsd || 0), 0),
    [rows]
  );
  const totalByok = useMemo(
    () => rows.reduce((sum, r) => sum + (r.currentMonthByokUsd || 0), 0),
    [rows]
  );

  const [runningEvaluator, setRunningEvaluator] = useState(false);
  const runEvaluatorNow = async () => {
    setRunningEvaluator(true);
    try {
      const res = await fetch("/api/admin/budgets/run-evaluator", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Evaluator failed");
      }
      const data = await res.json();
      const s = data.summary;
      toast.success(
        `Evaluator: ${s.evaluatedUsers} users · ${s.thresholdExceeded} over · ${s.autoPaused} paused · ${s.teamBurnAlerts} team-burn`
      );
      fetchRows();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluator failed");
    } finally {
      setRunningEvaluator(false);
    }
  };

  const openEdit = (row: AdminBudgetRow) => {
    setEditingUserId(row.userId);
    setEditLimit(row.monthlyUsdLimit == null ? "" : String(row.monthlyUsdLimit));
    setEditBurn(String(row.teamBurnAlertThresholdUsd));
  };

  const saveThreshold = async () => {
    if (!editingUserId) return;
    setSubmitting(true);
    try {
      const limit = editLimit.trim() === "" ? null : Number(editLimit);
      const burn = editBurn.trim() === "" ? undefined : Number(editBurn);
      if (limit !== null && (Number.isNaN(limit) || limit < 0)) {
        toast.error("Limit must be a non-negative number or blank");
        return;
      }
      if (burn !== undefined && (Number.isNaN(burn) || burn < 0)) {
        toast.error("Team burn threshold must be a non-negative number");
        return;
      }
      const res = await fetch("/api/admin/budgets/threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUserId,
          monthlyUsdLimit: limit,
          teamBurnAlertThresholdUsd: burn,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      toast.success("Threshold updated");
      setEditingUserId(null);
      fetchRows();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePause = async (row: AdminBudgetRow) => {
    const target = !row.isPaused;
    try {
      const res = await fetch("/api/admin/budgets/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.userId,
          paused: target,
          reason: target ? "manual: paused by admin" : "manual: unpaused by admin",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      toast.success(target ? "User paused" : "User unpaused");
      fetchRows();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const openAlerts = async (userId: string) => {
    setAlertsUserId(userId);
    setAlertsLoading(true);
    setAlerts([]);
    try {
      const res = await fetch(`/api/admin/budgets/alerts/${userId}`);
      if (!res.ok) throw new Error("Failed to load alerts");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAlertsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground">
          Per-user $/month spend, thresholds, and the auto-pause kill switch.
          Only <strong>billable</strong> spend (system + gateway) counts
          toward the cap — BYOK is user-paid and shown for context only.
          Team accounts get a $30 burn alert (no auto-pause).
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name"
            className="pl-9"
          />
        </div>
        {(["all", "managed", "paused", "team"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? "All"
              : f === "managed"
                ? "With threshold"
                : f === "paused"
                  ? "Paused"
                  : "Team"}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={fetchRows}>
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={runEvaluatorNow}
          disabled={runningEvaluator}
          title="Force the budget evaluator to run now (otherwise it runs hourly via pg_cron)."
        >
          {runningEvaluator && <Loader2 className="size-3 mr-1 animate-spin" />}
          Run evaluator now
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Tier</th>
                <th className="px-3 py-2 text-right" title="Billable spend (system + gateway) — counts toward the cap">
                  Billable $
                </th>
                <th className="px-3 py-2 text-right" title="BYOK spend — user-paid, never counts toward the cap">
                  BYOK $
                </th>
                <th className="px-3 py-2 text-right">Limit</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-left">Last alert</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const overLimit =
                  r.monthlyUsdLimit != null &&
                  r.currentMonthBillableUsd > r.monthlyUsdLimit;
                const overTeamBurn =
                  (r.tier === "team" || r.tier === "enterprise") &&
                  r.currentMonthBillableUsd > r.teamBurnAlertThresholdUsd;
                return (
                  <tr key={r.userId} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.email ?? "—"}</div>
                      {r.fullName && (
                        <div className="text-xs text-muted-foreground">{r.fullName}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn("font-mono text-xs", TIER_BADGE_COLORS[r.tier])}
                      >
                        {r.tier}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span
                        className={cn(
                          overLimit || overTeamBurn ? "text-red-600 font-semibold" : ""
                        )}
                      >
                        {fmtUsd(r.currentMonthBillableUsd)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {r.currentMonthByokUsd > 0
                        ? fmtUsd(r.currentMonthByokUsd)
                        : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.monthlyUsdLimit == null
                        ? <span className="text-muted-foreground">unlimited</span>
                        : fmtUsd(r.monthlyUsdLimit)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.isPaused ? (
                        <Badge variant="destructive" className="gap-1">
                          <Pause className="size-3" /> paused
                        </Badge>
                      ) : overLimit ? (
                        <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
                          <AlertTriangle className="size-3" /> over
                        </Badge>
                      ) : overTeamBurn ? (
                        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                          <Bell className="size-3" /> burn
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">ok</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.lastAlertAt ? (
                        <>
                          <div className="font-mono">{r.lastAlertType}</div>
                          <div className="text-muted-foreground">
                            {fmtRelative(r.lastAlertAt)}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={r.isPaused ? "default" : "outline"}
                          onClick={() => togglePause(r)}
                        >
                          {r.isPaused ? (
                            <>
                              <Play className="size-3 mr-1" />
                              Unpause
                            </>
                          ) : (
                            <>
                              <Pause className="size-3 mr-1" />
                              Pause
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openAlerts(r.userId)}>
                          Alerts
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    No users match.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-t">
                <td className="px-3 py-2 text-left font-semibold" colSpan={2}>
                  Totals (all users)
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  <DollarSign className="inline size-3 -mt-0.5 mr-0.5 text-emerald-500" />
                  {fmtUsd(totalBillable)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  {totalByok > 0 ? fmtUsd(totalByok) : <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-3 py-2" colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Edit-threshold modal — barebones in-page modal to avoid pulling
          a Dialog dependency that might not be present. */}
      {editingUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setEditingUserId(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Edit budget threshold</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Leave the monthly limit blank for unlimited. The team burn alert
              fires for Team / Enterprise only.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Monthly USD limit (blank = unlimited)
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 25.00"
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  disabled={submitting}
                />
              </label>
              <label className="block text-sm">
                Team burn alert threshold (USD)
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="30.00"
                  value={editBurn}
                  onChange={(e) => setEditBurn(e.target.value)}
                  disabled={submitting}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setEditingUserId(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={saveThreshold} disabled={submitting}>
                {submitting && <Loader2 className="size-4 mr-1 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts modal */}
      {alertsUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAlertsUserId(null)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Alert log</h2>
              <Button variant="ghost" size="sm" onClick={() => setAlertsUserId(null)}>
                Close
              </Button>
            </div>
            {alertsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No alerts yet.
              </p>
            ) : (
              <div className="mt-3 max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">When</th>
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-right">Threshold</th>
                      <th className="px-2 py-2 text-right">Actual</th>
                      <th className="px-2 py-2 text-left">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-2 py-2 font-mono text-xs">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">{a.alert_type}</td>
                        <td className="px-2 py-2 text-right font-mono">
                          {a.threshold_usd == null ? "—" : fmtUsd(a.threshold_usd)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          {fmtUsd(a.actual_usd)}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {new Date(a.period_start).toLocaleDateString()} →{" "}
                          {new Date(a.period_end).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
