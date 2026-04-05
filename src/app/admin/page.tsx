import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // Fetch all data in parallel
  const [authResult, profilesResult, postsResult, workspacesResult, quotasResult, ideasResult] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from("creator_profiles").select("user_id, full_name, subscription_tier, managed_ai_access, managed_ai_expires_at, onboarding_completed, ai_provider, created_at, updated_at"),
    supabase.from("posts").select("user_id, status, created_at"),
    supabase.from("workspaces").select("id", { count: "exact", head: true }),
    supabase.from("usage_quotas").select("user_id, posts_created, brainstorms_used, chat_messages_used, period_start").order("period_start", { ascending: false }),
    supabase.from("ideas").select("user_id"),
  ]);

  const authUsers = authResult.data?.users ?? [];
  const profiles = profilesResult.data ?? [];
  const allPosts = postsResult.data ?? [];
  const allIdeas = ideasResult.data ?? [];
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
    (p) => p.managed_ai_access && p.managed_ai_expires_at && new Date(p.managed_ai_expires_at) > now
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

  // ── Recent signups (last 5) ──
  const recentUsers = [...authUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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

  // ── Top content creators (by post count) ──
  const userPostCounts: Record<string, number> = {};
  for (const p of allPosts) {
    userPostCounts[p.user_id] = (userPostCounts[p.user_id] || 0) + 1;
  }
  const topCreators = Object.entries(userPostCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([userId, count]) => ({
      userId,
      name: profileMap[userId]?.full_name ?? "Unknown",
      email: emailMap[userId] ?? "",
      tier: profileMap[userId]?.subscription_tier ?? "free",
      posts: count,
      ideas: allIdeas.filter((i) => i.user_id === userId).length,
    }));

  // ── Current month usage totals ──
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const currentQuotas = (quotasResult.data ?? []).filter((q) => q.period_start === currentMonth);
  const totalPostsThisMonth = currentQuotas.reduce((s, q) => s + q.posts_created, 0);
  const totalBrainstormsThisMonth = currentQuotas.reduce((s, q) => s + q.brainstorms_used, 0);
  const totalChatMessagesThisMonth = currentQuotas.reduce((s, q) => s + q.chat_messages_used, 0);
  const activeUsersThisMonth = currentQuotas.filter((q) => q.posts_created + q.brainstorms_used + q.chat_messages_used > 0).length;

  const metrics = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-blue-500", border: "border-l-blue-500", bg: "bg-blue-500/10" },
    { label: "Active Trials", value: activeTrials, icon: Sparkles, color: "text-green-500", border: "border-l-green-500", bg: "bg-green-500/10" },
    { label: "Paid Subscribers", value: paidUsers, icon: CreditCard, color: "text-purple-500", border: "border-l-purple-500", bg: "bg-purple-500/10" },
    { label: "Total Posts", value: totalPosts, icon: FileText, color: "text-amber-500", border: "border-l-amber-500", bg: "bg-amber-500/10" },
    { label: "Workspaces", value: totalWorkspaces, icon: Building2, color: "text-emerald-500", border: "border-l-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">System-wide metrics, usage reports, and quick access to user data.</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className={`border-l-4 ${m.border}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-2xl font-bold">{m.value}</p>
                  </div>
                  <div className={`flex size-9 items-center justify-center rounded-full ${m.bg}`}>
                    <Icon className={`size-4 ${m.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alerts */}
      {(expiringTrials > 0 || notOnboarded > 0) && (
        <div className="flex flex-wrap gap-3">
          {expiringTrials > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-3.5" />
              {expiringTrials} trial{expiringTrials !== 1 ? "s" : ""} expiring within 3 days
            </div>
          )}
          {notOnboarded > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
              <Users className="size-3.5" />
              {notOnboarded} user{notOnboarded !== 1 ? "s" : ""} haven&apos;t completed onboarding
            </div>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* This Month's Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-primary" />
              This Month&apos;s Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold">{activeUsersThisMonth}</p>
                <p className="text-[10px] text-muted-foreground">Active Users</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold">{totalPostsThisMonth}</p>
                <p className="text-[10px] text-muted-foreground">Posts Created</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold">{totalBrainstormsThisMonth}</p>
                <p className="text-[10px] text-muted-foreground">Brainstorms</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-lg font-bold">{totalChatMessagesThisMonth}</p>
                <p className="text-[10px] text-muted-foreground">AI Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="size-4 text-purple-500" />
              Users by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(["free", "creator", "professional", "team", "enterprise"] as const).map((tier) => (
                <div key={tier} className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold">{tierCounts[tier] || 0}</p>
                  <Badge variant="secondary" className={cn("text-[10px]", TIER_BADGE_COLORS[tier])}>
                    {SUBSCRIPTION_TIERS[tier].label}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-blue-500" />
                Recent Signups
              </CardTitle>
              <Link href="/admin/users" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentUsers.map((u) => {
                const profile = profileMap[u.id];
                return (
                  <div key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">{profile?.full_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn("text-[9px]", TIER_BADGE_COLORS[(profile?.subscription_tier ?? "free") as SubscriptionTier])}>
                        {SUBSCRIPTION_TIERS[(profile?.subscription_tier ?? "free") as SubscriptionTier]?.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(u.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Trials Expiring Soon */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-amber-500" />
              Trials Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trialUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No trials expiring soon.</p>
            ) : (
              <div className="space-y-2">
                {trialUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">{u.full_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        u.daysLeft <= 3
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : u.daysLeft <= 7
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : ""
                      )}
                    >
                      {u.daysLeft} day{u.daysLeft !== 1 ? "s" : ""} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Content Creators */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="size-4 text-emerald-500" />
                Top Content Creators
              </CardTitle>
              <Link href="/admin/users" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-muted-foreground text-xs">User</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground text-xs">Tier</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground text-xs">Posts</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground text-xs">Ideas</th>
                </tr>
              </thead>
              <tbody>
                {topCreators.map((c) => (
                  <tr key={c.userId} className="border-b last:border-0">
                    <td className="py-2">
                      <p className="text-xs font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="py-2">
                      <Badge variant="secondary" className={cn("text-[9px]", TIER_BADGE_COLORS[c.tier as SubscriptionTier])}>
                        {SUBSCRIPTION_TIERS[c.tier as SubscriptionTier]?.label ?? c.tier}
                      </Badge>
                    </td>
                    <td className="py-2 text-right tabular-nums text-xs">{c.posts}</td>
                    <td className="py-2 text-right tabular-nums text-xs">{c.ideas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
