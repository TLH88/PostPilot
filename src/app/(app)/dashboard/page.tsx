import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Lightbulb,
  FileText,
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
  AlertCircle,
  Bot,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_DISPLAY_NAMES, getAvailableModels, getDefaultModel, type AIProvider } from "@/lib/ai/providers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IDEA_TEMPERATURES, POST_STATUSES } from "@/lib/constants";

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

  // Fetch stats in parallel
  const [ideasResult, draftsResult, scheduledResult, postedResult] =
    await Promise.all([
      supabase
        .from("ideas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "draft"),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "scheduled"),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "posted"),
    ]);

  const stats = [
    {
      label: "Total Ideas",
      value: ideasResult.count ?? 0,
      icon: Lightbulb,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Drafts in Progress",
      value: draftsResult.count ?? 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Scheduled Posts",
      value: scheduledResult.count ?? 0,
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Published Posts",
      value: postedResult.count ?? 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  // Fetch recent ideas and drafts in parallel
  const [recentIdeasResult, recentDraftsResult] = await Promise.all([
    supabase
      .from("ideas")
      .select("id, title, temperature, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("posts")
      .select("id, title, content, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const recentIdeas = recentIdeasResult.data ?? [];
  const recentDrafts = recentDraftsResult.data ?? [];

  // Fetch content pillar distribution from posts + ideas
  const { data: profileFull } = await supabase
    .from("creator_profiles")
    .select("content_pillars")
    .eq("user_id", user.id)
    .single();

  const contentPillars: string[] = profileFull?.content_pillars ?? [];

  // Count pillars from posts (all non-archived)
  const { data: pillarPosts } = await supabase
    .from("posts")
    .select("content_pillar")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .not("content_pillar", "is", null);

  const pillarCounts: Record<string, number> = {};
  for (const pillar of contentPillars) {
    pillarCounts[pillar] = 0;
  }
  for (const p of pillarPosts ?? []) {
    if (p.content_pillar) {
      pillarCounts[p.content_pillar] = (pillarCounts[p.content_pillar] || 0) + 1;
    }
  }

  const totalPillarPosts = Object.values(pillarCounts).reduce((a, b) => a + b, 0);
  const pillarEntries = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1]);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/ideas"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
        >
          <Lightbulb className="size-4" />
          Generate Ideas
        </Link>
        <Link
          href="/posts"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
        >
          <Plus className="size-4" />
          Start New Post
        </Link>
        <Link
          href="/calendar"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
        >
          <Calendar className="size-4" />
          View Calendar
        </Link>
      </div>

      {/* Recent Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Ideas */}
        <Card>
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
                {recentIdeas.map((idea) => {
                  const temp =
                    IDEA_TEMPERATURES[
                      idea.temperature as keyof typeof IDEA_TEMPERATURES
                    ];
                  return (
                    <div
                      key={idea.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <p className="truncate text-sm font-medium">
                        {idea.title}
                      </p>
                      {temp && (
                        <Badge variant="secondary" className={temp.color}>
                          {temp.icon} {temp.label}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {recentIdeas.length > 0 && (
              <div className="mt-4">
                <Link
                  href="/ideas"
                  className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  View all ideas
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Drafts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-blue-500" />
              Recent Drafts
            </CardTitle>
            <CardDescription>Your latest posts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No posts yet. Start writing!
              </p>
            ) : (
              <div className="space-y-3">
                {recentDrafts.map((post) => {
                  const status =
                    POST_STATUSES[
                      post.status as keyof typeof POST_STATUSES
                    ];
                  const displayTitle =
                    post.title ||
                    (post.content
                      ? post.content.slice(0, 50) +
                        (post.content.length > 50 ? "..." : "")
                      : "Untitled Post");
                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg p-1 transition-colors hover:bg-muted"
                    >
                      <p className="truncate text-sm font-medium">
                        {displayTitle}
                      </p>
                      {status && (
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
            {recentDrafts.length > 0 && (
              <div className="mt-4">
                <Link
                  href="/posts"
                  className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  View all posts
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Pillar Distribution */}
      {contentPillars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Content Pillar Balance
            </CardTitle>
            <CardDescription>
              How your content is distributed across your pillars.
              {pillarEntries.some(([, count]) => count === 0) && (
                <span className="ml-1 text-yellow-600">
                  Some pillars need attention.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pillarEntries.map(([pillar, count]) => {
                const pct = totalPillarPosts > 0 ? Math.round((count / totalPillarPosts) * 100) : 0;
                const isUnderserved = count === 0;
                return (
                  <div key={pillar} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={isUnderserved ? "text-yellow-600 font-medium" : "font-medium"}>
                        {pillar}
                        {isUnderserved && (
                          <span className="ml-1.5 text-xs text-yellow-500">needs content</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {count} post{count !== 1 ? "s" : ""} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${isUnderserved ? "bg-yellow-300" : "bg-primary"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPillarPosts === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Pillar tracking begins when you assign content pillars to your posts and ideas.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
