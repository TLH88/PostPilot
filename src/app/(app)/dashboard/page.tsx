import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Lightbulb,
  FileText,
  Calendar,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Bot,
} from "lucide-react";
import { NewPostButton } from "@/components/posts/new-post-button";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceIdServer } from "@/lib/workspace-server";
import { applyWorkspaceFilter } from "@/lib/workspace";
import { PROVIDER_DISPLAY_NAMES, getAvailableModels, getDefaultModel, type AIProvider } from "@/lib/ai/providers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { POST_STATUSES } from "@/lib/constants";
import { ContentPillarBalance } from "@/components/dashboard/content-pillar-balance";
import { UsageSummary } from "@/components/dashboard/usage-summary";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { GenerateIdeasButton } from "@/components/ideas/generate-ideas-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for greeting
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("full_name, onboarding_completed, ai_provider, ai_model")
    .eq("user_id", user.id)
    .single();

  const displayName = profile?.full_name || "there";
  const activeWorkspaceId = await getActiveWorkspaceIdServer();

  // Fetch stats in parallel, scoped to active workspace (or individual mode)
  const [ideasResult, draftsResult, scheduledResult, postedResult] =
    await Promise.all([
      applyWorkspaceFilter(
        supabase.from("ideas").select("id", { count: "exact", head: true }),
        user.id,
        activeWorkspaceId
      ),
      applyWorkspaceFilter(
        supabase.from("posts").select("id", { count: "exact", head: true }),
        user.id,
        activeWorkspaceId
      ).eq("status", "draft"),
      applyWorkspaceFilter(
        supabase.from("posts").select("id", { count: "exact", head: true }),
        user.id,
        activeWorkspaceId
      ).eq("status", "scheduled"),
      applyWorkspaceFilter(
        supabase.from("posts").select("id", { count: "exact", head: true }),
        user.id,
        activeWorkspaceId
      ).in("status", ["posted", "archived"]),
    ]);

  const stats = [
    {
      label: "Total Ideas",
      value: ideasResult.count ?? 0,
      icon: Lightbulb,
      iconColor: "text-yellow-500",
      iconBg: "bg-yellow-500/10",
      border: "border-l-yellow-500",
    },
    {
      label: "Drafts in Progress",
      value: draftsResult.count ?? 0,
      icon: FileText,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      border: "border-l-blue-500",
    },
    {
      label: "Scheduled Posts",
      value: scheduledResult.count ?? 0,
      icon: Calendar,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-500/10",
      border: "border-l-purple-500",
    },
    {
      label: "Published Posts",
      value: postedResult.count ?? 0,
      icon: TrendingUp,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      border: "border-l-emerald-500",
    },
  ];

  // Fetch recent ideas and drafts in parallel
  const [recentIdeasResult, recentDraftsResult] = await Promise.all([
    applyWorkspaceFilter(
      supabase.from("ideas").select("id, title, created_at"),
      user.id,
      activeWorkspaceId
    )
      .order("created_at", { ascending: false })
      .limit(5),
    applyWorkspaceFilter(
      supabase
        .from("posts")
        .select("id, title, content, status, updated_at, image_url, content_pillars"),
      user.id,
      activeWorkspaceId
    )
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  type RecentIdea = { id: string; title: string; created_at: string };
  type RecentDraft = { id: string; title: string | null; content: string; status: string; updated_at: string; image_url: string | null; content_pillars: string[] | null };
  const recentIdeas: RecentIdea[] = (recentIdeasResult.data as RecentIdea[] | null) ?? [];
  const recentDrafts: RecentDraft[] = (recentDraftsResult.data as RecentDraft[] | null) ?? [];

  // Fetch content pillar distribution from posts + ideas
  const { data: profileFull } = await supabase
    .from("creator_profiles")
    .select("content_pillars")
    .eq("user_id", user.id)
    .single();

  const contentPillars: string[] = profileFull?.content_pillars ?? [];

  // Count pillars from all posts (including archived — archived posts still count for metrics)
  const { data: pillarPosts } = await applyWorkspaceFilter(
    supabase.from("posts").select("content_pillars"),
    user.id,
    activeWorkspaceId
  );

  const pillarCounts: Record<string, number> = {};
  for (const pillar of contentPillars) {
    pillarCounts[pillar] = 0;
  }
  for (const p of pillarPosts ?? []) {
    for (const pillar of p.content_pillars ?? []) {
      pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
    }
  }

  const totalPillarPosts = Object.values(pillarCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Onboarding banner */}
      {profile && !profile.onboarding_completed && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4">
            <AlertCircle className="size-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Complete your profile setup to get personalized content
                suggestions.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Complete Setup
              <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your content overview. Use the quick actions below to brainstorm ideas, start a new post, or check your schedule.
        </p>
        {profile?.ai_provider && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Bot className="size-3.5" />
            <span>
              Powered by{" "}
              {PROVIDER_DISPLAY_NAMES[profile.ai_provider as AIProvider]}
              {" "}
              <span className="opacity-70">
                ({getAvailableModels(profile.ai_provider as AIProvider).find(
                  (m) => m.value === (profile.ai_model ?? getDefaultModel(profile.ai_provider as AIProvider))
                )?.label})
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div id="tour-dashboard-metrics" className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`border-l-4 ${stat.border}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`flex size-9 items-center justify-center rounded-full ${stat.iconBg}`}>
                    <Icon className={`size-4 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div id="tour-quick-actions" className="flex flex-wrap gap-3">
        <GenerateIdeasButton
          id="tour-generate-ideas"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
        />
        <NewPostButton
          id="tour-new-post"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
          label="Start New Post"
        />
        <Link
          id="tour-view-calendar"
          href="/calendar"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
        >
          <Calendar className="size-4" />
          View Calendar
        </Link>
      </div>

      {/* Two-column layout: main content (left) + content balance (right) */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Left column — 80% */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Recent Drafts — card grid */}
          <div id="tour-recent-drafts" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-blue-500" />
                <h2 className="text-sm font-semibold">Recent Drafts</h2>
              </div>
              {recentDrafts.length > 0 && (
                <Link
                  href="/posts"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  View all posts
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
            {recentDrafts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <FileText className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">No posts yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Start writing your first LinkedIn post!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {recentDrafts.map((post) => {
                  const status = POST_STATUSES[post.status as keyof typeof POST_STATUSES];
                  const displayTitle =
                    post.title ||
                    (post.content
                      ? post.content.slice(0, 50) + (post.content.length > 50 ? "..." : "")
                      : "Untitled Post");
                  const contentPreview = post.content
                    ? post.content.slice(0, 80) + (post.content.length > 80 ? "..." : "")
                    : "";

                  return (
                    <Link key={post.id} href={`/posts/${post.id}`}>
                      <Card className={`h-full transition-colors hover:bg-hover-highlight overflow-hidden ${post.image_url ? "pt-0 gap-0" : ""}`}>
                        {post.image_url && (
                          <div className="relative w-full h-32 overflow-hidden">
                            <img src={post.image_url} alt="" className="w-full h-full object-cover rounded-t-xl" />
                            {status && (
                              <Badge variant="secondary" className={`${status.color} text-[10px] absolute bottom-2 left-2 shadow-sm`}>
                                {status.label}
                              </Badge>
                            )}
                          </div>
                        )}
                        <CardContent className="space-y-2 p-3">
                          {!post.image_url && status && (
                            <Badge variant="secondary" className={`${status.color} text-[10px]`}>
                              {status.label}
                            </Badge>
                          )}
                          <p className="text-sm font-semibold leading-snug line-clamp-2">
                            {displayTitle}
                          </p>
                          {contentPreview && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {contentPreview}
                            </p>
                          )}
                          {(post.content_pillars ?? []).map((pillar: string) => (
                            <Badge key={pillar} variant="outline" className="text-[10px] h-4">
                              {pillar}
                            </Badge>
                          ))}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Ideas */}
          <Card id="tour-recent-ideas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-yellow-500" />
                Recent Ideas
              </CardTitle>
              <CardDescription>Your latest content ideas</CardDescription>
            </CardHeader>
            <CardContent>
              {recentIdeas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No ideas yet. Start brainstorming!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentIdeas.map((idea) => (
                    <Link
                      key={idea.id}
                      href={`/ideas/${idea.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg p-1 transition-colors hover:bg-hover-highlight"
                    >
                      <p className="truncate text-sm font-medium">
                        {idea.title}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              {recentIdeas.length > 0 && (
                <div className="mt-4">
                  <Link
                    href="/ideas"
                    className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-colors"
                  >
                    View all ideas
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — 20% */}
        <div className="w-full lg:w-[20%] shrink-0 space-y-3">
          {/* Spacer to align with "Recent Drafts" header row */}
          <div className="hidden lg:block h-5" />
          <div id="tour-usage-summary"><UsageSummary /></div>
          {contentPillars.length > 0 && (
            <div id="tour-content-balance">
              <ContentPillarBalance
                pillarCounts={pillarCounts}
                totalPosts={totalPillarPosts}
                title="Content Balance"
              />
            </div>
          )}
          {/* Activity feed — shown for all users, but most useful for team members */}
          <ActivityFeed limit={10} title="Recent Activity" />
        </div>
      </div>
    </div>
  );
}
