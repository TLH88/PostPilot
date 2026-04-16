import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { UsageTrendsChart } from "@/components/admin/usage-trends-chart";
import {
  Users,
  Sparkles,
  CreditCard,
  FileText,
  Building2,
  ArrowRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  LayoutDashboard,
} from "lucide-react";
import { TIER_BADGE_COLORS, SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/constants";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TIER_DOT_COLORS: Record<string, string> = {
  free: "bg-gray-400",
  creator: "bg-blue-500",
  professional: "bg-purple-500",
  team: "bg-amber-500",
  enterprise: "bg-gray-400",
};

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // Fetch all data in parallel
  const [authResult, profilesResult, postsResult, workspacesResult, quotasResult, ideasResult] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from("creator_profiles").select("user_id, full_name, subscription_tier, account_status, managed_ai_access, managed_ai_expires_at, onboarding_completed, ai_provider, created_at, updated_at"),
    supabase.from("posts").select("user_id, status, created_at"),
    supabase.from("workspaces").select("id", { count: "exact", head: true }),
    supabase.from("usage_quotas").select("user_id, posts_created, brainstorms_used, chat_messages_used, period_start").order("period_start", { ascending: false }),
    supabase.from("ideas").select("user_id"),
  ]);

  const authUsers = authResult.data?.users ?? [];
  const profiles = profilesResult.data ?? [];
  const allPosts = postsResult.data ?? [];
  const totalWorkspaces = workspacesResult.count ?? 0;

  const now = new Date();

  // Email map
  const emailMap: Record<string, string> = {};
  for (const u of authUsers) { if (u.email) emailMap[u.id] = u.email; }

  // Profile map
  const profileMap: Record<string, typeof profiles[0]> = {};
  for (const p of profiles) { profileMap[p.user_id] = p; }

  // ── Metric calculations ──
  const totalUsers = authUsers.length;
  const activeTrials = profiles.filter(
    (p) => p.account_status === "trial" || (p.managed_ai_access && p.managed_ai_expires_at && new Date(p.managed_ai_expires_at) > now)
  ).length;
  const expiringTrials = profiles.filter(
    (p) => p.managed_ai_access && p.managed_ai_expires_at && (() => {
      const exp = new Date(p.managed_ai_expires_at!);
      const daysLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 3;
    })()
  ).length;
  const paidUsers = profiles.filter((p) => p.subscription_tier !== "free").length;
  const tierCounts: Record<string, number> = {};
  for (const p of profiles) {
    tierCounts[p.subscription_tier] = (tierCounts[p.subscription_tier] || 0) + 1;
  }
  const totalPosts = allPosts.length;
  const notOnboarded = profiles.filter((p) => !p.onboarding_completed).length;

  // ── Recent signups (last 30 days, sorted newest first) ──
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recentUsers = [...authUsers]
    .filter((u) => new Date(u.created_at) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Active trials expiring soon ──
  const trialUsers = profiles
    .filter((p) => p.managed_ai_access && p.managed_ai_expires_at)
    .map((p) => ({
      ...p,
      email: emailMap[p.user_id],
      daysLeft: Math.ceil((new Date(p.managed_ai_expires_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter((p) => p.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // ── Current month usage totals ──
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const currentQuotas = (quotasResult.data ?? []).filter((q) => q.period_start === currentMonth);
  const totalPostsThisMonth = currentQuotas.reduce((s, q) => s + q.posts_created, 0);
  const totalBrainstormsThisMonth = currentQuotas.reduce((s, q) => s + q.brainstorms_used, 0);
  const totalChatMessagesThisMonth = currentQuotas.reduce((s, q) => s + q.chat_messages_used, 0);
  const activeUsersThisMonth = currentQuotas.filter((q) => q.posts_created + q.brainstorms_used + q.chat_messages_used > 0).length;

  const metrics = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      subtitle: totalUsers > 0 ? `${Math.round((paidUsers / totalUsers) * 100)}% conversion` : undefined,
      subtitleColor: "muted" as const,
      borderColor: "border-l-indigo-500",
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-500/10",
    },
    {
      label: "Active Trials",
      value: activeTrials,
      icon: Sparkles,
      subtitle: activeTrials > 0 ? "Monitoring health" : "No active trials",
      subtitleColor: activeTrials > 0 ? "green" as const : "muted" as const,
      borderColor: "border-l-amber-500",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "Paid Subscribers",
      value: paidUsers,
      icon: CreditCard,
      subtitle: paidUsers > 0 ? "ARR growing" : undefined,
      subtitleColor: "green" as const,
      borderColor: "border-l-emerald-500",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "Total Posts",
      value: totalPosts,
      icon: FileText,
      subtitle: totalPosts > 0 ? "Content velocity high" : undefined,
      subtitleColor: "green" as const,
      borderColor: "border-l-blue-500",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Workspaces",
      value: totalWorkspaces,
      icon: Building2,
      subtitle: totalWorkspaces > 0 ? "Active ecosystems" : undefined,
      subtitleColor: "green" as const,
      borderColor: "border-l-purple-500",
      iconColor: "text-purple-500",
      iconBg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <LayoutDashboard className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-9">
          System-wide metrics, usage reports, and quick access to user data.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={cn("rounded-xl border bg-card p-5 space-y-2 border-l-4", m.borderColor)}>
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {m.label}
                </p>
                <div className={cn("flex size-8 items-center justify-center rounded-lg", m.iconBg)}>
                  <Icon className={cn("size-4", m.iconColor)} />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight">{m.value}</p>
              {m.subtitle && (
                <p className={cn(
                  "text-xs font-medium",
                  m.subtitleColor === "green"
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                )}>
                  {m.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {(expiringTrials > 0 || notOnboarded > 0) && (
        <div className="flex flex-wrap gap-3">
          {expiringTrials > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-2.5 text-xs font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-3.5" />
              {expiringTrials} trial{expiringTrials !== 1 ? "s" : ""} expiring within 3 days
            </div>
          )}
          {notOnboarded > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 px-4 py-2.5 text-xs font-medium text-blue-800 dark:text-blue-200">
              <Users className="size-3.5" />
              {notOnboarded} user{notOnboarded !== 1 ? "s" : ""} haven&apos;t completed onboarding
            </div>
          )}
        </div>
      )}

      {/* This Month's Usage + Users by Tier */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* This Month's Usage with trends chart — spans 2 columns */}
        <UsageTrendsChart />

        {/* Users by Tier */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-base font-semibold mb-4">Users by Tier</h3>
          <div className="space-y-4">
            {(["free", "creator", "professional", "team", "enterprise"] as const).map((tier) => {
              const count = tierCounts[tier] || 0;
              const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2.5 rounded-full", TIER_DOT_COLORS[tier])} />
                      <span className="text-sm font-medium">
                        {SUBSCRIPTION_TIERS[tier].label}
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", TIER_DOT_COLORS[tier])}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Signups + Trials Expiring Soon */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Signups */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-base font-semibold">Recent Signups</h3>
            <Link href="/admin/users" className="text-xs text-primary font-medium hover:underline">
              View All
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tier</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.slice(0, 10).map((u) => {
                const profile = profileMap[u.id];
                const name = profile?.full_name ?? u.email?.split("@")[0] ?? "Unknown";
                const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                const tier = (profile?.subscription_tier ?? "free") as SubscriptionTier;

                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-hover-highlight transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-xs">{profile?.full_name ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={cn("text-[9px] uppercase font-semibold tracking-wider", TIER_BADGE_COLORS[tier])}>
                        {SUBSCRIPTION_TIERS[tier]?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {timeAgo(u.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Trials Expiring Soon */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-base font-semibold">Trials Expiring Soon</h3>
            <Link href="/admin/users" className="text-xs text-primary font-medium hover:underline">
              View All
            </Link>
          </div>
          {trialUsers.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              No trials expiring soon
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Days Left</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {trialUsers.slice(0, 10).map((u) => (
                  <tr key={u.user_id} className="border-b last:border-0 hover:bg-hover-highlight transition-colors">
                    <td className="px-5 py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate text-xs">{u.full_name ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              u.daysLeft <= 1
                                ? "bg-red-500"
                                : u.daysLeft <= 3
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            )}
                            style={{ width: `${Math.min((u.daysLeft / 14) * 100, 100)}%` }}
                          />
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-semibold",
                            u.daysLeft <= 1
                              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                              : u.daysLeft <= 3
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                                : ""
                          )}
                        >
                          {u.daysLeft} day{u.daysLeft !== 1 ? "s" : ""} left
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.daysLeft <= 3 ? (
                        <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary uppercase tracking-wider">
                          Send Offer
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                          Wait
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
