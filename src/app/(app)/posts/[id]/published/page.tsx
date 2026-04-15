"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Pencil,
  Calendar,
  Clock,
  Hash,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PUBLISH_METHODS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";
import { hasFeature } from "@/lib/feature-gate";
import { LinkedInPreview } from "@/components/posts/linkedin-preview";
import { PostProgressBar } from "@/components/posts/post-progress-bar";
import { EngagementAnalyticsCard } from "@/components/posts/engagement-analytics-card";
import { RefreshAnalyticsButton } from "@/components/posts/refresh-analytics-button";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Post, CreatorProfile } from "@/types";

export default function PublishedPostPage() {
  const { id: postId } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [post, setPost] = useState<Post | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  const userTier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) ?? "free";
  const hasAnalyticsScope = profile?.linkedin_scopes?.includes("r_member_postAnalytics") ?? false;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .eq("user_id", user.id)
        .single();

      if (postError || !postData) { router.push("/posts"); return; }

      const p = postData as Post;

      // If not posted, redirect to editor
      if (p.status !== "posted") {
        router.replace(`/posts/${postId}`);
        return;
      }

      setPost(p);

      const { data: profileData } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) setProfile(profileData as CreatorProfile);

      // Check LinkedIn connection
      const statusRes = await fetch("/api/linkedin/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setLinkedinConnected(statusData.connected && !statusData.expired);
      }

      setLoading(false);
    }
    load();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDuplicate() {
    if (!post) return;
    setDuplicating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: post.title ? `${post.title} (Copy)` : "Untitled Post",
          content: post.content,
          hashtags: post.hashtags,
          content_pillars: post.content_pillars,
          image_url: post.image_url,
          image_storage_path: post.image_storage_path,
          image_alt_text: post.image_alt_text,
          status: "draft",
          character_count: post.character_count,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Draft created from published post");
      router.push(`/posts/${newPost!.id}`);
    } catch {
      toast.error("Failed to duplicate post");
    } finally {
      setDuplicating(false);
    }
  }

  function handleAnalyticsRefresh(data: { impressions: number; reactions: number; comments: number; reposts: number; engagements: number }) {
    if (!post) return;
    setPost({
      ...post,
      impressions: data.impressions,
      reactions: data.reactions,
      comments_count: data.comments,
      reposts: data.reposts,
      engagements: data.engagements,
      analytics_fetched_at: new Date().toISOString(),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading published post...</div>
      </div>
    );
  }

  if (!post) return null;

  const postedAt = post.posted_at ? new Date(post.posted_at) : null;
  const daysLive = postedAt ? Math.floor((Date.now() - postedAt.getTime()) / 86400000) : 0;
  const publishMethod = post.publish_method && PUBLISH_METHODS[post.publish_method]
    ? PUBLISH_METHODS[post.publish_method]
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/posts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          Back to Posts
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {post.linkedin_post_url && (
            <a
              href={post.linkedin_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink className="size-3.5" />
              View on LinkedIn
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="gap-1.5"
          >
            <Copy className="size-3.5" />
            {duplicating ? "Duplicating..." : "Duplicate as Draft"}
          </Button>
          <Link
            href={`/posts/${postId}?edit=true`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="size-3.5" />
            Edit Original
          </Link>
        </div>

        <h1 className="text-2xl font-bold leading-tight">
          {post.title || "Untitled Post"}
        </h1>
      </div>

      {/* Progress Bar */}
      <PostProgressBar
        status={post.status}
        userTier={userTier}
        scheduledFor={post.scheduled_for ? new Date(post.scheduled_for) : null}
        scheduledAt={post.scheduled_at ? new Date(post.scheduled_at) : null}
        createdAt={post.created_at ? new Date(post.created_at) : null}
        postedAt={postedAt}
      />

      {/* Engagement Analytics */}
      {hasFeature(userTier, "analytics") ? (
        <EngagementAnalyticsCard
          post={post}
          onUpdate={(key, val) => setPost({ ...post, [key]: val })}
          refreshButton={
            <RefreshAnalyticsButton
              postId={post.id}
              linkedinConnected={linkedinConnected}
              hasAnalyticsScope={hasAnalyticsScope}
              onRefresh={handleAnalyticsRefresh}
            />
          }
        />
      ) : (
        <div className="rounded-lg border bg-card p-4">
          <UpgradePrompt feature="Engagement Analytics" requiredTier="creator" variant="inline" />
        </div>
      )}

      {/* Post Metadata */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {postedAt && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                <Calendar className="size-3" />
                Date Posted
              </div>
              <p className="text-sm font-medium">
                {postedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}

          {publishMethod && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                <Layers className="size-3" />
                Publish Method
              </div>
              <Badge variant="secondary" className={publishMethod.color}>
                {publishMethod.label}
              </Badge>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              <Clock className="size-3" />
              Days Live
            </div>
            <p className="text-sm font-medium">
              {daysLive === 0 ? "Today" : daysLive === 1 ? "1 day" : `${daysLive} days`}
            </p>
          </div>

          {(post.content_pillars?.length > 0 || post.hashtags?.length > 0) && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                <Hash className="size-3" />
                Topics
              </div>
              <div className="flex flex-wrap gap-1">
                {post.content_pillars?.map((pillar) => (
                  <Badge key={pillar} variant="secondary" className="text-[10px]">
                    {pillar}
                  </Badge>
                ))}
                {post.hashtags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    #{tag.replace(/^#/, "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LinkedIn Preview */}
      <div>
        <LinkedInPreview
          content={post.content}
          title={post.title}
          imageUrl={post.image_url}
          authorName={profile?.full_name || ""}
          authorHeadline={profile?.headline || ""}
        />
      </div>

      {/* Future expansion placeholder */}
      {/* Planned: engagement trends chart, best time analysis, audience insights */}
    </div>
  );
}
