import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Layers, CalendarClock, ClipboardCheck, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceIdServer } from "@/lib/workspace-server";
import { applyWorkspaceFilter } from "@/lib/workspace";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { POST_STATUSES, type SubscriptionTier } from "@/lib/constants";
import { hasFeature } from "@/lib/feature-gate";
import { NewPostButton } from "@/components/posts/new-post-button";
import { PostActions } from "@/components/posts/post-actions";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PostItem {
  id: string;
  title: string | null;
  content: string;
  status: string;
  character_count: number;
  updated_at: string;
  hashtags: string[];
  content_pillars: string[];
  image_url: string | null;
  impressions: number | null;
  reactions: number | null;
  scheduled_for: string | null;
}

function PostCard({ post, userTier }: { post: PostItem; userTier: SubscriptionTier }) {
  const status = POST_STATUSES[post.status as keyof typeof POST_STATUSES];
  const displayTitle =
    post.title ||
    (post.content
      ? post.content.slice(0, 60) + (post.content.length > 60 ? "..." : "")
      : "Untitled Post");

  const contentPreview = post.content
    ? post.content.slice(0, 120) + (post.content.length > 120 ? "..." : "")
    : "";

  return (
    <Link href={`/posts/${post.id}`} className="h-full">
      <Card className={`flex flex-col h-full transition-colors hover:bg-hover-highlight overflow-hidden ${post.image_url ? "pt-0 gap-0" : ""}`}>
        {/* Post image */}
        {post.image_url && (
          <div className="relative w-full h-32 overflow-hidden">
            <img
              src={post.image_url}
              alt=""
              className="w-full h-full object-cover rounded-t-xl"
            />
            {status && (
              <Badge variant="secondary" className={`${status.color} text-[10px] absolute bottom-2 left-2 shadow-sm`}>
                {status.label}
              </Badge>
            )}
          </div>
        )}
        <CardContent className="flex-1 space-y-2">
          {/* Status badge (only when no image) */}
          {!post.image_url && (
          <div className="flex items-center justify-between gap-2">
            {status && (
              <Badge variant="secondary" className={`${status.color} text-[10px]`}>
                {status.label}
              </Badge>
            )}
          </div>
          )}
          {/* Scheduled clarification */}
          {post.status === "scheduled" && post.scheduled_for && (
            <p className="text-[10px] text-purple-600 dark:text-purple-400">
              Will publish to LinkedIn on {formatDate(post.scheduled_for)} at{" "}
              {new Date(post.scheduled_for).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          )}

          {/* Title */}
          <p className="text-sm font-semibold leading-snug line-clamp-2">
            {displayTitle}
          </p>

          {/* Content preview */}
          {contentPreview && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {contentPreview}
            </p>
          )}

          {/* Pillar + hashtag count */}
          <div className="flex flex-wrap gap-1">
            {(post.content_pillars ?? []).map((pillar) => (
              <Badge key={pillar} variant="outline" className="text-[10px] h-4">
                {pillar}
              </Badge>
            ))}
            {post.hashtags?.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4">
                {post.hashtags.length} hashtag{post.hashtags.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Analytics (posted posts with data) */}
          {post.impressions != null && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{post.impressions.toLocaleString()} impressions</span>
              {post.reactions != null && <span>{post.reactions} reactions</span>}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{post.character_count} chars</span>
            <span>Updated {formatDate(post.updated_at)}</span>
          </div>
        </CardContent>

        {/* Action buttons */}
        <CardFooter className="gap-1">
          <PostActions postId={post.id} status={post.status} title={post.title} variant="footer" userTier={userTier} />
        </CardFooter>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <FileText className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Start writing your first LinkedIn post!
      </p>
      <div className="mt-6">
        <NewPostButton />
      </div>
    </div>
  );
}

export default async function PostsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const activeWorkspaceId = await getActiveWorkspaceIdServer();

  const postsQuery = applyWorkspaceFilter(
    supabase
      .from("posts")
      .select("id, title, content, status, character_count, updated_at, hashtags, content_pillars, image_url, impressions, reactions, scheduled_for"),
    user.id,
    activeWorkspaceId
  ).order("updated_at", { ascending: false });

  const [{ data: posts }, { data: profileData }] = await Promise.all([
    postsQuery,
    supabase
      .from("creator_profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single(),
  ]);

  const userTier = (profileData?.subscription_tier as SubscriptionTier) ?? "free";
  const canReview = hasFeature(userTier, "review_status");
  const allPosts: PostItem[] = posts ?? [];

  const draftPosts = allPosts.filter((p) => p.status === "draft");
  const reviewPosts = allPosts.filter((p) => p.status === "review");
  const scheduledPosts = allPosts.filter((p) => p.status === "scheduled");
  const pastDuePosts = allPosts.filter((p) => p.status === "past_due");
  const postedPosts = allPosts.filter((p) => p.status === "posted");
  const archivedPosts = allPosts.filter((p) => p.status === "archived");

  // Grouped filters
  // Scheduled posts have their own tab — keep "In Work" focused on the
  // stages where the user is actively editing or reviewing.
  const inWorkPosts = allPosts.filter((p) => ["draft", "review"].includes(p.status));
  const completePosts = allPosts.filter((p) => ["posted", "archived"].includes(p.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Posts</h1>
          <p className="text-muted-foreground">
            Draft, edit, and schedule your LinkedIn posts. Use the tabs to filter by status and the menu on each card to archive or delete.
          </p>
        </div>
        <div id="tour-posts-new-post"><NewPostButton /></div>
      </div>

      {/* Metrics */}
      <div id="tour-posts-metrics" className={`grid grid-cols-2 ${canReview ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4`}>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{allPosts.length}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/10">
                <Layers className="size-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{scheduledPosts.length}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-full bg-purple-500/10">
                <CalendarClock className="size-4 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        {canReview && (
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">In Review</p>
                  <p className="text-2xl font-bold">{reviewPosts.length}</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-full bg-purple-500/10">
                  <ClipboardCheck className="size-4 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{postedPosts.length}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10">
                <Send className="size-4 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="in_work">
        <TabsList id="tour-posts-filters">
          <TabsTrigger value="in_work">
            In Work ({inWorkPosts.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({draftPosts.length})
          </TabsTrigger>
          {canReview && (
            <TabsTrigger value="review">
              In Review ({reviewPosts.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="scheduled">
            Scheduled ({scheduledPosts.length})
          </TabsTrigger>
          {pastDuePosts.length > 0 && (
            <TabsTrigger
              value="past_due"
              title="Posts that missed their scheduled publish time. Reschedule, publish now, or mark as posted to resolve."
            >
              Past Due ({pastDuePosts.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="posted">
            Posted ({postedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="complete">
            Complete ({completePosts.length})
          </TabsTrigger>
          {archivedPosts.length > 0 && (
            <TabsTrigger value="archived">
              Archived ({archivedPosts.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="all">
            All ({allPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in_work">
          {inWorkPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div id="tour-posts-cards" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inWorkPosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="complete">
          {completePosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t published any posts yet.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <NewPostButton label="Start a draft" />
                <Link
                  href="/calendar"
                  className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent"
                >
                  View calendar
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completePosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {allPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allPosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft">
          {draftPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {draftPosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review">
          {reviewPosts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No posts in review.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviewPosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          {scheduledPosts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No scheduled posts.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scheduledPosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past_due">
          {pastDuePosts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No past due posts.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastDuePosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posted">
          {postedPosts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No published posts yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {postedPosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {archivedPosts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No archived posts.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedPosts.map((post) => (
                <PostCard key={post.id} post={post} userTier={userTier} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
