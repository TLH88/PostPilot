import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { POST_STATUSES } from "@/lib/constants";
import { NewPostButton } from "@/components/posts/new-post-button";
import { LinkedInShareButton } from "@/components/posts/linkedin-share-button";

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
}

function PostCard({ post }: { post: PostItem }) {
  const status = POST_STATUSES[post.status as keyof typeof POST_STATUSES];
  const displayTitle =
    post.title ||
    (post.content
      ? post.content.slice(0, 60) + (post.content.length > 60 ? "..." : "")
      : "Untitled Post");

  const showShareButton = ["review", "scheduled", "past_due"].includes(post.status);

  return (
    <Link href={`/posts/${post.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayTitle}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{post.character_count} characters</span>
              <span>Updated {formatDate(post.updated_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showShareButton && (
              <LinkedInShareButton
                content={post.content}
                hashtags={post.hashtags ?? []}
              />
            )}
            {status && (
              <Badge variant="secondary" className={`shrink-0 ${status.color}`}>
                {status.label}
              </Badge>
            )}
          </div>
        </CardContent>
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

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, content, status, character_count, updated_at, hashtags")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const allPosts: PostItem[] = posts ?? [];

  const draftPosts = allPosts.filter((p) => p.status === "draft");
  const reviewPosts = allPosts.filter((p) => p.status === "review");
  const scheduledPosts = allPosts.filter((p) => p.status === "scheduled");
  const pastDuePosts = allPosts.filter((p) => p.status === "past_due");
  const postedPosts = allPosts.filter((p) => p.status === "posted");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Posts</h1>
          <p className="text-muted-foreground">
            Manage and track all your LinkedIn posts.
          </p>
        </div>
        <NewPostButton />
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({allPosts.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({draftPosts.length})
          </TabsTrigger>
          <TabsTrigger value="review">
            In Review ({reviewPosts.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({scheduledPosts.length})
          </TabsTrigger>
          {pastDuePosts.length > 0 && (
            <TabsTrigger value="past_due">
              Past Due ({pastDuePosts.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="posted">
            Posted ({postedPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {allPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {allPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft">
          {draftPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {draftPosts.map((post) => (
                <PostCard key={post.id} post={post} />
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
            <div className="space-y-3">
              {reviewPosts.map((post) => (
                <PostCard key={post.id} post={post} />
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
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <PostCard key={post.id} post={post} />
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
            <div className="space-y-3">
              {pastDuePosts.map((post) => (
                <PostCard key={post.id} post={post} />
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
            <div className="space-y-3">
              {postedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
