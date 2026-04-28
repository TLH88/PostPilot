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
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NewPostButton } from "@/components/posts/new-post-button";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceIdServer } from "@/lib/workspace-server";
import { applyWorkspaceFilter } from "@/lib/workspace";
import { PROVIDER_DISPLAY_NAMES, getAvailableModels, getDefaultModel, type AIProvider } from "@/lib/ai/providers";
import { resolveAIAccess } from "@/lib/ai/has-ai-access";
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
import { FocusViewHome } from "@/components/focus-view/focus-view-home";

// ─── Shared post-cards section ────────────────────────────────────────────────
// Same layout the dashboard uses for Recent Drafts. Extracted so Scheduled
// and Posted sections render identically without code duplication.

type PostCardItem = {
  id: string;
  title: string | null;
  content: string;
  status: string;
  image_url: string | null;
  content_pillars: string[] | null;
};

type IconComponent = React.ComponentType<{ className?: string }>;

function PostCardsSection({
  sectionId,
  icon: Icon,
  iconColor,
  iconBg,
  sectionBg,
  accentBorder,
  title,
  tooltip,
  posts,
  viewAllHref,
  viewAllLabel,
  emptyTitle,
  emptyBody,
}: {
  sectionId?: string;
  icon: IconComponent;
  iconColor: string;
  iconBg: string;
  sectionBg: string;
  accentBorder: string;
  title: string;
  tooltip?: string;
  posts: PostCardItem[];
  viewAllHref: string;
  viewAllLabel: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <section
      id={sectionId}
      className={`rounded-xl border-l-4 ${accentBorder} ${sectionBg} p-4 space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex size-7 items-center justify-center rounded-full ${iconBg}`}
          >
            <Icon className={`size-3.5 ${iconColor}`} />
          </div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  aria-label={`About ${title}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-sm">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {posts.length > 0 && (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {viewAllLabel}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">{emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{emptyBody}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for greeting + AI access resolution
  // BP-099: also pulls ui_mode so we can branch into Focus View early
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "full_name, onboarding_completed, ai_provider, ai_model, ai_api_key_encrypted, force_ai_gateway, managed_ai_access, managed_ai_expires_at, account_status, trial_ends_at, ui_mode"
    )
    .eq("user_id", user.id)
    .single();

  // BP-099: Focus View — when the user has chosen the simplified launcher,
  // skip the full dashboard render and show the four-card home instead.
  // Standard view (the existing dashboard below) is unchanged.
  if (profile?.ui_mode === "focus") {
    const focusName = profile.full_name || user.email?.split("@")[0] || "there";
    return <FocusViewHome userName={focusName} />;
  }

  // Best-effort onboarding step fetch — separate query so this degrades
  // gracefully if the column hasn't been migrated yet.
  let onboardingCurrentStep: number | null = null;
  try {
    const { data: stepRow } = await supabase
      .from("user_profiles")
      .select("onboarding_current_step")
      .eq("user_id", user.id)
      .single();
    const v = (stepRow as { onboarding_current_step?: number | null } | null)
      ?.onboarding_current_step;
    if (typeof v === "number") onboardingCurrentStep = v;
  } catch {
    // Column may not exist yet in some environments — banner falls back to
    // the binary "Complete Setup" state.
  }

  // First name only — keeps the greeting personal without feeling formal.
  const displayName = profile?.full_name?.trim().split(/\s+/)[0] || "there";
  const activeWorkspaceId = await getActiveWorkspaceIdServer();

  // Resolve AI access (UX hint — authoritative check still happens in /api/ai/*)
  const { count: providerKeyCount } = await supabase
    .from("ai_provider_keys")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const gatewayAvailable =
    !!process.env.VERCEL_OIDC_TOKEN || !!process.env.AI_GATEWAY_API_KEY;
  const aiAccess = resolveAIAccess(
    profile as Parameters<typeof resolveAIAccess>[0],
    gatewayAvailable,
    (providerKeyCount ?? 0) > 0
  );

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

  // Fetch recent ideas, drafts, scheduled posts, and posted posts in parallel
  const [
    recentIdeasResult,
    recentDraftsResult,
    recentScheduledResult,
    recentPostedResult,
  ] = await Promise.all([
    applyWorkspaceFilter(
      supabase.from("ideas").select("id, title, description, created_at"),
      user.id,
      activeWorkspaceId
    )
      .order("created_at", { ascending: false })
      .limit(3),
    applyWorkspaceFilter(
      supabase
        .from("posts")
        .select("id, title, content, status, updated_at, image_url, content_pillars"),
      user.id,
      activeWorkspaceId
    )
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(3),
    applyWorkspaceFilter(
      supabase
        .from("posts")
        .select("id, title, content, status, scheduled_for, updated_at, image_url, content_pillars"),
      user.id,
      activeWorkspaceId
    )
      .eq("status", "scheduled")
      .order("updated_at", { ascending: false })
      .limit(3),
    applyWorkspaceFilter(
      supabase
        .from("posts")
        .select("id, title, content, status, posted_at, updated_at, image_url, content_pillars"),
      user.id,
      activeWorkspaceId
    )
      .eq("status", "posted")
      .order("posted_at", { ascending: false })
      .limit(3),
  ]);

  type RecentIdea = { id: string; title: string; description: string | null; created_at: string };
  type RecentDraft = { id: string; title: string | null; content: string; status: string; updated_at: string; image_url: string | null; content_pillars: string[] | null };
  type RecentScheduled = RecentDraft & { scheduled_for: string | null };
  type RecentPosted = RecentDraft & { posted_at: string | null };
  const recentIdeas: RecentIdea[] = (recentIdeasResult.data as RecentIdea[] | null) ?? [];
  const recentDrafts: RecentDraft[] = (recentDraftsResult.data as RecentDraft[] | null) ?? [];
  const recentScheduled: RecentScheduled[] = (recentScheduledResult.data as RecentScheduled[] | null) ?? [];
  const recentPosted: RecentPosted[] = (recentPostedResult.data as RecentPosted[] | null) ?? [];

  // Fetch content pillar distribution from posts + ideas
  const { data: profileFull } = await supabase
    .from("user_profiles")
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
      {/* AI provider guard — blocks cryptic mid-flow errors */}
      {profile && !aiAccess.hasAccess && (
        <Card className="border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4">
            <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                AI is not set up yet
              </p>
              <p className="text-xs text-muted-foreground">
                Idea generation and AI drafting won&apos;t work until you
                configure an AI provider or enable PostPilot&apos;s built-in AI.
              </p>
            </div>
            <Link
              href="/settings#ai-provider"
              className="inline-flex h-8 items-center gap-1 rounded-md bg-amber-600 px-3 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
            >
              Set up AI
              <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Onboarding banner — step-aware when we have progress */}
      {profile && !profile.onboarding_completed && (() => {
        const totalSteps = 6;
        const stepLabels = [
          "Basic Info",
          "Background",
          "Expertise",
          "Voice & Style",
          "AI Setup",
          "Content Tools",
        ];
        const step =
          onboardingCurrentStep !== null
            ? Math.max(0, Math.min(totalSteps - 1, onboardingCurrentStep))
            : null;
        const label = step !== null ? stepLabels[step] : null;
        const message =
          step !== null
            ? `Resume profile setup — Step ${step + 1} of ${totalSteps}: ${label}`
            : "Complete your profile setup to get personalized content suggestions.";
        const cta = step !== null ? "Resume Setup" : "Complete Setup";
        const href = step !== null ? `/onboarding?step=${step}` : "/onboarding";
        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4">
              <AlertCircle className="size-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{message}</p>
              </div>
              <Link
                href={href}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {cta}
                <ArrowRight className="size-3" />
              </Link>
            </CardContent>
          </Card>
        );
      })()}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Let&apos;s make something worth sharing today. We can brainstorm a fresh idea, pick up where a draft left off, or line up the week on your calendar — your call.
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
          className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          disabledReason={
            aiAccess.hasAccess
              ? undefined
              : "Set up AI in Settings first"
          }
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
          {/* Recent Drafts */}
          <PostCardsSection
            sectionId="tour-recent-drafts"
            icon={FileText}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/15"
            sectionBg="bg-blue-500/5 dark:bg-blue-500/[0.07]"
            accentBorder="border-l-blue-500"
            title="Recent Drafts"
            tooltip="Posts you've started but haven't scheduled or published yet. Click any card to pick up where you left off."
            posts={recentDrafts}
            viewAllHref="/posts"
            viewAllLabel="View all posts"
            emptyTitle="No drafts yet"
            emptyBody="Start a new post and it'll land here automatically."
          />

          {/* Recent Scheduled Posts */}
          <PostCardsSection
            icon={Calendar}
            iconColor="text-purple-500"
            iconBg="bg-purple-500/15"
            sectionBg="bg-purple-500/5 dark:bg-purple-500/[0.07]"
            accentBorder="border-l-purple-500"
            title="Recent Scheduled Posts"
            tooltip="Posts you've queued up to publish automatically at a future date and time."
            posts={recentScheduled}
            viewAllHref="/posts"
            viewAllLabel="View all scheduled"
            emptyTitle="Nothing on the schedule"
            emptyBody="Line up a draft for a future date and it'll show up here."
          />

          {/* Recently Posted */}
          <PostCardsSection
            icon={TrendingUp}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/15"
            sectionBg="bg-emerald-500/5 dark:bg-emerald-500/[0.07]"
            accentBorder="border-l-emerald-500"
            title="Recently Posted"
            tooltip="Your most recent posts that have gone live on LinkedIn. Click one to review its analytics."
            posts={recentPosted}
            viewAllHref="/posts"
            viewAllLabel="View all posted"
            emptyTitle="Nothing published yet"
            emptyBody="Once a post goes live on LinkedIn, we'll show it here."
          />

          {/* Recent Ideas */}
          <Card id="tour-recent-ideas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-yellow-500" />
                Recent Ideas
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      aria-label="About Recent Ideas"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      The latest ideas saved in your Idea Bank — including brainstorms we&apos;ve generated and anything you&apos;ve captured manually. Click one to start developing it into a post.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>A few sparks we&apos;ve captured lately — pick one and we&apos;ll turn it into a post.</CardDescription>
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
                      className="flex flex-col gap-0.5 rounded-lg p-1 transition-colors hover:bg-hover-highlight"
                    >
                      <p className="truncate text-sm font-medium">
                        {idea.title}
                      </p>
                      {idea.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {idea.description}
                        </p>
                      )}
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

        {/* Right column — aligned to top of first left-column section */}
        <div className="w-full lg:w-[24%] shrink-0 space-y-3">
          <div id="tour-usage-summary"><UsageSummary /></div>
          {contentPillars.length > 0 && (
            <div id="tour-content-balance">
              <ContentPillarBalance
                pillarCounts={pillarCounts}
                totalPosts={totalPillarPosts}
                title="Content Balance"
                previewLimit={5}
              />
            </div>
          )}
          {/* Activity feed — shown for all users, but most useful for team members */}
          <ActivityFeed limit={25} previewLimit={5} title="Recent Activity" />
        </div>
      </div>
    </div>
  );
}
