/**
 * SQL query helpers for the AI Usage admin dashboard (BP-085 Phase 2).
 * All queries use the admin/service-role Supabase client to bypass RLS.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ── Date range helpers ──────────────────────────────────────────────────────

export type DateRange = "1d" | "7d" | "30d" | "90d";

export function rangeToInterval(range: DateRange): string {
  switch (range) {
    case "1d": return "1 day";
    case "7d": return "7 days";
    case "30d": return "30 days";
    case "90d": return "90 days";
    default: return "30 days";
  }
}

export function rangeToPriorInterval(range: DateRange): string {
  // Double the range for comparison period
  switch (range) {
    case "1d": return "2 days";
    case "7d": return "14 days";
    case "30d": return "60 days";
    case "90d": return "180 days";
    default: return "60 days";
  }
}

// ── Summary KPIs ──────────────────────────────────────────────────────────

export interface UsageSummaryKPIs {
  totalSpend: number;
  totalRequests: number;
  avgCostPerRequest: number;
  activeUsers: number;
  mostExpensiveRoute: string | null;
  gatewayPct: number;
  cacheSavings: number;
  successRate: number;
  // Prior period for comparison
  priorSpend: number;
  priorRequests: number;
}

export async function getUsageSummary(range: DateRange): Promise<UsageSummaryKPIs> {
  // Direct query approach — no RPC function needed, works immediately
  return getUsageSummaryDirect(range);
}

async function getUsageSummaryDirect(range: DateRange): Promise<UsageSummaryKPIs> {
  const supabase = createAdminClient();
  const since = new Date();
  const interval = rangeToInterval(range);
  const ms = { "1 day": 86400000, "7 days": 604800000, "30 days": 2592000000, "90 days": 7776000000 }[interval] ?? 2592000000;
  since.setTime(Date.now() - ms);
  const priorSince = new Date();
  priorSince.setTime(Date.now() - ms * 2);

  const { data: events } = await supabase
    .from("ai_usage_events")
    .select("cost_usd, cached_savings_usd, source, success, route, user_id")
    .gte("created_at", since.toISOString());

  const { data: priorEvents } = await supabase
    .from("ai_usage_events")
    .select("cost_usd")
    .gte("created_at", priorSince.toISOString())
    .lt("created_at", since.toISOString());

  const rows = events ?? [];
  const priorRows = priorEvents ?? [];

  const totalSpend = rows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const totalRequests = rows.length;
  const activeUsers = new Set(rows.map((r) => r.user_id)).size;
  const gatewayCount = rows.filter((r) => r.source === "gateway").length;
  const gatewayPct = totalRequests > 0 ? (gatewayCount / totalRequests) * 100 : 0;
  const cacheSavings = rows.reduce((s, r) => s + Number(r.cached_savings_usd ?? 0), 0);
  const successCount = rows.filter((r) => r.success).length;
  const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 100;

  // Most expensive route
  const routeCosts: Record<string, number> = {};
  for (const r of rows) {
    routeCosts[r.route] = (routeCosts[r.route] ?? 0) + Number(r.cost_usd ?? 0);
  }
  const mostExpensiveRoute = Object.entries(routeCosts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const priorSpend = priorRows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const priorRequests = priorRows.length;

  return {
    totalSpend,
    totalRequests,
    avgCostPerRequest: totalRequests > 0 ? totalSpend / totalRequests : 0,
    activeUsers,
    mostExpensiveRoute,
    gatewayPct,
    cacheSavings,
    successRate,
    priorSpend,
    priorRequests,
  };
}

// ── Time series ────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  day: string;
  provider: string;
  cost: number;
  requests: number;
}

export async function getCostTimeSeries(range: DateRange): Promise<TimeSeriesPoint[]> {
  const supabase = createAdminClient();
  const ms = { "1d": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 }[range] ?? 2592000000;
  const since = new Date(Date.now() - ms);

  const { data } = await supabase
    .from("ai_usage_events")
    .select("created_at, provider, cost_usd")
    .gte("created_at", since.toISOString())
    .order("created_at");

  if (!data?.length) return [];

  // Group by day + provider
  const grouped: Record<string, { cost: number; requests: number }> = {};
  for (const row of data) {
    const day = row.created_at.slice(0, 10); // YYYY-MM-DD
    const key = `${day}|${row.provider}`;
    if (!grouped[key]) grouped[key] = { cost: 0, requests: 0 };
    grouped[key].cost += Number(row.cost_usd ?? 0);
    grouped[key].requests += 1;
  }

  return Object.entries(grouped).map(([key, val]) => {
    const [day, provider] = key.split("|");
    return { day, provider, ...val };
  }).sort((a, b) => a.day.localeCompare(b.day));
}

// ── Top users ──────────────────────────────────────────────────────────────

export interface TopUser {
  userId: string;
  email?: string;
  fullName?: string;
  tier?: string;
  totalCost: number;
  totalRequests: number;
}

export async function getTopUsers(range: DateRange, limit: number = 10): Promise<TopUser[]> {
  const supabase = createAdminClient();
  const ms = { "1d": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 }[range] ?? 2592000000;
  const since = new Date(Date.now() - ms);

  const { data } = await supabase
    .from("ai_usage_events")
    .select("user_id, cost_usd")
    .gte("created_at", since.toISOString());

  if (!data?.length) return [];

  // Aggregate by user
  const userCosts: Record<string, { cost: number; requests: number }> = {};
  for (const row of data) {
    if (!userCosts[row.user_id]) userCosts[row.user_id] = { cost: 0, requests: 0 };
    userCosts[row.user_id].cost += Number(row.cost_usd ?? 0);
    userCosts[row.user_id].requests += 1;
  }

  // Sort and limit
  const sorted = Object.entries(userCosts)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, limit);

  // Enrich with user info
  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from("creator_profiles")
    .select("user_id, full_name, subscription_tier")
    .in("user_id", userIds);

  const { data: authResult } = await supabase.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  for (const u of authResult?.users ?? []) {
    if (u.email) emailMap[u.id] = u.email;
  }

  const profileMap: Record<string, { full_name: string | null; subscription_tier: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.user_id] = p;
  }

  return sorted.map(([userId, stats]) => ({
    userId,
    email: emailMap[userId],
    fullName: profileMap[userId]?.full_name ?? undefined,
    tier: profileMap[userId]?.subscription_tier,
    totalCost: stats.cost,
    totalRequests: stats.requests,
  }));
}

// ── Route cost breakdown (for donut chart + features page) ─────────────────

export interface RouteCost {
  route: string;
  totalCost: number;
  requests: number;
  uniqueUsers: number;
}

export async function getRouteCosts(range: DateRange): Promise<RouteCost[]> {
  const supabase = createAdminClient();
  const ms = { "1d": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 }[range] ?? 2592000000;
  const since = new Date(Date.now() - ms);

  const { data } = await supabase
    .from("ai_usage_events")
    .select("route, cost_usd, user_id")
    .gte("created_at", since.toISOString());

  if (!data?.length) return [];

  const grouped: Record<string, { cost: number; requests: number; users: Set<string> }> = {};
  for (const row of data) {
    if (!grouped[row.route]) grouped[row.route] = { cost: 0, requests: 0, users: new Set() };
    grouped[row.route].cost += Number(row.cost_usd ?? 0);
    grouped[row.route].requests += 1;
    grouped[row.route].users.add(row.user_id);
  }

  return Object.entries(grouped)
    .map(([route, stats]) => ({
      route,
      totalCost: stats.cost,
      requests: stats.requests,
      uniqueUsers: stats.users.size,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}

// ── Provider reliability ───────────────────────────────────────────────────

export interface ProviderReliability {
  provider: string;
  totalRequests: number;
  failures: number;
  successRate: number;
  avgLatencyMs: number;
  topErrorCode: string | null;
}

export async function getProviderReliability(range: DateRange): Promise<ProviderReliability[]> {
  const supabase = createAdminClient();
  const ms = { "1d": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 }[range] ?? 2592000000;
  const since = new Date(Date.now() - ms);

  const { data } = await supabase
    .from("ai_usage_events")
    .select("provider, success, error_code, latency_ms")
    .gte("created_at", since.toISOString());

  if (!data?.length) return [];

  const grouped: Record<string, {
    total: number;
    failures: number;
    latencySum: number;
    latencyCount: number;
    errorCodes: Record<string, number>;
  }> = {};

  for (const row of data) {
    if (!grouped[row.provider]) {
      grouped[row.provider] = { total: 0, failures: 0, latencySum: 0, latencyCount: 0, errorCodes: {} };
    }
    const g = grouped[row.provider];
    g.total += 1;
    if (!row.success) {
      g.failures += 1;
      if (row.error_code) {
        g.errorCodes[row.error_code] = (g.errorCodes[row.error_code] ?? 0) + 1;
      }
    }
    if (row.latency_ms != null) {
      g.latencySum += row.latency_ms;
      g.latencyCount += 1;
    }
  }

  return Object.entries(grouped)
    .map(([provider, stats]) => {
      const topError = Object.entries(stats.errorCodes).sort((a, b) => b[1] - a[1])[0];
      return {
        provider,
        totalRequests: stats.total,
        failures: stats.failures,
        successRate: stats.total > 0 ? ((stats.total - stats.failures) / stats.total) * 100 : 100,
        avgLatencyMs: stats.latencyCount > 0 ? Math.round(stats.latencySum / stats.latencyCount) : 0,
        topErrorCode: topError ? topError[0] : null,
      };
    })
    .sort((a, b) => b.totalRequests - a.totalRequests);
}

// ── Per-user detail ────────────────────────────────────────────────────────

export interface UserUsageDetail {
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

export async function getUserUsageDetail(
  userId: string,
  range: DateRange,
  page: number = 0,
  pageSize: number = 50
): Promise<UserUsageDetail | null> {
  const supabase = createAdminClient();
  const ms = { "1d": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 }[range] ?? 2592000000;
  const since = new Date(Date.now() - ms);

  // User info
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("full_name, subscription_tier")
    .eq("user_id", userId)
    .single();

  const { data: authResult } = await supabase.auth.admin.listUsers();
  const email = authResult?.users?.find((u) => u.id === userId)?.email;

  // Aggregated stats
  const { data: allEvents } = await supabase
    .from("ai_usage_events")
    .select("route, provider, cost_usd, cached_savings_usd")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  // Paginated recent events
  const { data: recentEvents } = await supabase
    .from("ai_usage_events")
    .select("id, route, provider, model, source, input_tokens, output_tokens, cost_usd, success, error_code, latency_ms, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (!allEvents) return null;

  const totalCost = allEvents.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const cacheSavings = allEvents.reduce((s, r) => s + Number(r.cached_savings_usd ?? 0), 0);

  // Top route
  const routeCounts: Record<string, number> = {};
  const providerCounts: Record<string, number> = {};
  for (const r of allEvents) {
    routeCounts[r.route] = (routeCounts[r.route] ?? 0) + 1;
    providerCounts[r.provider] = (providerCounts[r.provider] ?? 0) + 1;
  }
  const topRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    userId,
    email,
    fullName: profile?.full_name ?? undefined,
    tier: profile?.subscription_tier,
    totalCost,
    totalRequests: allEvents.length,
    cacheSavings,
    topRoute,
    topProvider,
    recentEvents: (recentEvents ?? []).map((e) => ({
      id: e.id,
      route: e.route,
      provider: e.provider,
      model: e.model,
      source: e.source,
      inputTokens: e.input_tokens,
      outputTokens: e.output_tokens,
      costUsd: e.cost_usd ? Number(e.cost_usd) : null,
      success: e.success,
      errorCode: e.error_code,
      latencyMs: e.latency_ms,
      createdAt: e.created_at,
    })),
  };
}
