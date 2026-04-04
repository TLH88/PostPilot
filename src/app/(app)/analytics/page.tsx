"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  MousePointerClick,
  Upload,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { hasFeature } from "@/lib/feature-gate";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { HelpLink, HelpStepList, HelpTip } from "@/components/help-link";
import { ImportAnalyticsDialog } from "@/components/analytics/import-analytics-dialog";
import type { SubscriptionTier } from "@/lib/constants";
import type { Post } from "@/types";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [importOpen, setImportOpen] = useState(false);

  const canUseAnalytics = hasFeature(tier, "analytics");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Fetch tier
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();
    if (profile?.subscription_tier) setTier(profile.subscription_tier as SubscriptionTier);

    // Fetch all posted/archived posts with analytics
    const { data } = await supabase
      .from("posts")
      .select("id, title, content, content_pillars, status, posted_at, impressions, reactions, comments_count, reposts, engagements")
      .eq("user_id", user.id)
      .in("status", ["posted", "archived"])
      .order("posted_at", { ascending: false });

    setPosts(data as Post[] ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate summary metrics
  const trackedPosts = posts.filter((p) => p.impressions != null || p.engagements != null);
  const totalImpressions = trackedPosts.reduce((sum, p) => sum + (p.impressions ?? 0), 0);
  const totalReactions = trackedPosts.reduce((sum, p) => sum + (p.reactions ?? 0), 0);
  const totalComments = trackedPosts.reduce((sum, p) => sum + (p.comments_count ?? 0), 0);
  const totalReposts = trackedPosts.reduce((sum, p) => sum + (p.reposts ?? 0), 0);
  const avgEngagementRate = totalImpressions > 0
    ? ((totalReactions + totalComments + totalReposts) / totalImpressions * 100).toFixed(1)
    : "0.0";

  // Top posts by impressions
  const topPosts = [...trackedPosts]
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, 10);
  const maxImpressions = topPosts[0]?.impressions ?? 1;

  // Pillar performance
  const pillarMap = new Map<string, { impressions: number; reactions: number; count: number }>();
  for (const post of trackedPosts) {
    const pillars = post.content_pillars?.length ? post.content_pillars : ["Uncategorized"];
    for (const pillar of pillars) {
      const existing = pillarMap.get(pillar) ?? { impressions: 0, reactions: 0, count: 0 };
      existing.impressions += post.impressions ?? 0;
      existing.reactions += post.reactions ?? 0;
      existing.count += 1;
      pillarMap.set(pillar, existing);
    }
  }
  const pillarStats = [...pillarMap.entries()]
    .map(([name, stats]) => ({
      name,
      avgImpressions: Math.round(stats.impressions / stats.count),
      totalReactions: stats.reactions,
      count: stats.count,
    }))
    .sort((a, b) => b.avgImpressions - a.avgImpressions);
  const maxPillarImpressions = pillarStats[0]?.avgImpressions ?? 1;

  const metricCards = [
    { label: "Total Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-blue-500", border: "border-l-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Reactions", value: totalReactions.toLocaleString(), icon: Heart, color: "text-red-500", border: "border-l-red-500", bg: "bg-red-500/10" },
    { label: "Total Comments", value: totalComments.toLocaleString(), icon: MessageCircle, color: "text-amber-500", border: "border-l-amber-500", bg: "bg-amber-500/10" },
    { label: "Avg Engagement Rate", value: `${avgEngagementRate}%`, icon: TrendingUp, color: "text-emerald-500", border: "border-l-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Analytics
            <HelpLink anchor="import-linkedin-post-analytics" title="How to import LinkedIn analytics">
              <h3 className="text-base font-semibold">Import LinkedIn Post Analytics</h3>
              <p className="text-muted-foreground">
                LinkedIn provides analytics on your post performance including impressions and engagements.
                Import this data into PostPilot in two passes — one for impressions and one for engagements.
              </p>

              <h4 className="font-semibold mt-4">Importing Impressions</h4>
              <HelpStepList>
                <li>Open your <strong>LinkedIn profile</strong> and scroll down to the <strong>Analytics</strong> section (just above About).</li>
                <li>Click <strong>&quot;Show all analytics&quot;</strong> at the bottom of that section.</li>
                <li>Click the <strong>top-right box</strong> to view <strong>Post Impressions</strong>.</li>
                <li>Set the filter to <strong>90 days</strong> and ensure <strong>Impressions</strong> is selected.</li>
                <li>Select all (<strong>Ctrl+A</strong> / <strong>Cmd+A</strong>) and copy (<strong>Ctrl+C</strong> / <strong>Cmd+C</strong>).</li>
                <li>In PostPilot, click <strong>&quot;Import from LinkedIn&quot;</strong> on the Analytics page.</li>
                <li>Paste the content and click <strong>&quot;Parse &amp; Preview&quot;</strong>.</li>
                <li>Review the matches and click <strong>&quot;Import&quot;</strong>.</li>
              </HelpStepList>

              <h4 className="font-semibold mt-4">Importing Engagements</h4>
              <HelpStepList>
                <li>Go back to LinkedIn and change the filter from <strong>Impressions</strong> to <strong>Engagements</strong>.</li>
                <li>Select all and copy the entire page again.</li>
                <li>Click <strong>&quot;Import from LinkedIn&quot;</strong> again in PostPilot.</li>
                <li>Paste, click <strong>&quot;Parse &amp; Preview&quot;</strong>, review, and <strong>&quot;Import&quot;</strong>.</li>
              </HelpStepList>

              <HelpTip>
                You can repeat this process anytime to update your analytics. PostPilot updates existing values
                rather than creating duplicates.
              </HelpTip>
            </HelpLink>
          </h1>
          <p className="text-muted-foreground max-w-[80%]">
            Measure what resonates with your audience. Track impressions, reactions, comments, and reposts across your published posts. Import data directly from LinkedIn or enter numbers manually to see which content pillars and topics drive the most engagement.
          </p>
        </div>
        {canUseAnalytics && (
          <Button onClick={() => setImportOpen(true)} className="gap-2 shrink-0 self-start sm:self-center">
            <Upload className="size-4" />
            Import from LinkedIn
          </Button>
        )}
      </div>

      {/* Feature gate */}
      {!canUseAnalytics && (
        <UpgradePrompt feature="Analytics" requiredTier="creator" variant="banner" />
      )}

      {canUseAnalytics && (
        <>
          {/* Metric Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {metricCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className={`border-l-4 ${card.border}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <p className="text-2xl font-bold">{card.value}</p>
                      </div>
                      <div className={cn("flex size-9 items-center justify-center rounded-full", card.bg)}>
                        <Icon className={cn("size-4", card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {trackedPosts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <BarChart3 className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">No analytics data yet</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  Import your LinkedIn analytics data or manually enter engagement numbers on posted posts.
                </p>
                <Button onClick={() => setImportOpen(true)} className="mt-4 gap-2" variant="outline">
                  <Upload className="size-3.5" />
                  Import from LinkedIn
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Posts by Impressions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="size-4 text-blue-500" />
                    Top Posts by Impressions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topPosts.map((post) => {
                    const pct = maxImpressions > 0 ? ((post.impressions ?? 0) / maxImpressions) * 100 : 0;
                    return (
                      <Link key={post.id} href={`/posts/${post.id}`} className="block">
                        <div className="rounded-md p-2 hover:bg-hover-highlight transition-colors space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium truncate flex-1 mr-2">
                              {post.title || (post.content?.slice(0, 40) + "...") || "Untitled"}
                            </span>
                            <span className="text-muted-foreground tabular-nums shrink-0">
                              {(post.impressions ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Content Pillar Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="size-4 text-emerald-500" />
                    Performance by Content Pillar
                  </CardTitle>
                  <CardDescription>Average impressions per pillar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pillarStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Assign content pillars to your posts to see performance data.</p>
                  ) : (
                    pillarStats.map((pillar) => {
                      const pct = maxPillarImpressions > 0 ? (pillar.avgImpressions / maxPillarImpressions) * 100 : 0;
                      return (
                        <div key={pillar.name} className="rounded-md p-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">
                              {pillar.name}
                              <span className="ml-1.5 text-muted-foreground">({pillar.count} post{pillar.count !== 1 ? "s" : ""})</span>
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              avg {pillar.avgImpressions.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* All Posts Table */}
          {trackedPosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Tracked Posts</CardTitle>
                <CardDescription>
                  {trackedPosts.length} post{trackedPosts.length !== 1 ? "s" : ""} with analytics data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">Post</th>
                        <th className="pb-2 px-2 text-right font-medium text-muted-foreground">Impressions</th>
                        <th className="pb-2 px-2 text-right font-medium text-muted-foreground">Reactions</th>
                        <th className="pb-2 px-2 text-right font-medium text-muted-foreground">Comments</th>
                        <th className="pb-2 px-2 text-right font-medium text-muted-foreground">Reposts</th>
                        <th className="pb-2 pl-2 text-right font-medium text-muted-foreground">Pillar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackedPosts.map((post) => (
                        <tr key={post.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <Link href={`/posts/${post.id}`} className="text-xs font-medium hover:text-primary transition-colors line-clamp-1">
                              {post.title || (post.content?.slice(0, 50) + "...") || "Untitled"}
                            </Link>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-xs">
                            {post.impressions?.toLocaleString() ?? "—"}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-xs">
                            {post.reactions?.toLocaleString() ?? "—"}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-xs">
                            {post.comments_count?.toLocaleString() ?? "—"}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-xs">
                            {post.reposts?.toLocaleString() ?? "—"}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {post.content_pillars?.length ? (
                              <div className="flex flex-wrap gap-0.5 justify-end">
                                {post.content_pillars.map((pillar: string) => (
                                  <Badge key={pillar} variant="outline" className="text-[10px] h-4">{pillar}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Import Dialog */}
      <ImportAnalyticsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={loadData}
      />
    </div>
  );
}
