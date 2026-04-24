"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, CheckCircle2, XCircle, Clock, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReviewPost {
  id: string;
  title: string | null;
  content: string;
  status: string;
  approval_status: string | null;
  approval_stage: string | null;
  updated_at: string;
  user_id: string;
  assigned_to: string | null;
  workspace_id: string | null;
  author_name?: string;
  assignee_name?: string;
}

type Filter = "awaiting_me" | "all_pending" | "recent";

export default function ReviewQueuePage() {
  const [posts, setPosts] = useState<ReviewPost[]>([]);
  const [filter, setFilter] = useState<Filter>("awaiting_me");
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Find workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!member) { setLoading(false); return; }
    setWorkspaceId(member.workspace_id);
    setUserRole(member.role);

    // Fetch posts based on filter
    let query = supabase
      .from("posts")
      .select("id, title, content, status, approval_status, approval_stage, updated_at, user_id, assigned_to, workspace_id")
      .eq("workspace_id", member.workspace_id)
      .order("updated_at", { ascending: false });

    if (filter === "awaiting_me" || filter === "all_pending") {
      query = query.eq("status", "review").eq("approval_status", "pending");
    } else if (filter === "recent") {
      query = query.in("approval_status", ["approved", "changes_requested"]).limit(50);
    }

    const { data: postsData } = await query;
    const fetchedPosts = (postsData ?? []) as ReviewPost[];

    // Fetch author + assignee names
    const userIds = Array.from(new Set(
      fetchedPosts.flatMap((p) => [p.user_id, p.assigned_to].filter(Boolean) as string[])
    ));
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds.length > 0 ? userIds : [""]);

    const nameMap: Record<string, string> = {};
    for (const p of profiles ?? []) nameMap[p.user_id] = p.full_name ?? "";

    setPosts(fetchedPosts.map((p) => ({
      ...p,
      author_name: nameMap[p.user_id] ?? "Unknown",
      assignee_name: p.assigned_to ? nameMap[p.assigned_to] ?? "Unknown" : undefined,
    })));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function quickDecide(postId: string, decision: "approved" | "changes_requested") {
    setActioning(postId);
    try {
      const res = await fetch("/api/posts/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decide", postId, decision }),
      });
      if (!res.ok) throw new Error();
      toast.success(decision === "approved" ? "Post approved" : "Changes requested");
      load();
    } catch {
      toast.error("Failed to record decision");
    } finally {
      setActioning(null);
    }
  }

  const canReview = userRole && ["owner", "admin", "editor"].includes(userRole);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>;
  }

  if (!workspaceId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="size-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">Join or create a workspace to access the review queue.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Posts awaiting approval in your workspace.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex rounded-lg border border-input p-0.5 bg-muted/50 w-fit">
        {(["awaiting_me", "all_pending", "recent"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "awaiting_me" && "Awaiting My Review"}
            {f === "all_pending" && "All Pending"}
            {f === "recent" && "Recently Decided"}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="size-8 text-emerald-500 mb-3" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter === "awaiting_me" && "No posts are awaiting your review."}
              {filter === "all_pending" && "No posts are currently in review."}
              {filter === "recent" && "No recent approval decisions."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isPending = post.approval_status === "pending";
            return (
              <Card key={post.id} className={cn(isPending && "border-l-4 border-l-amber-500")}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">
                        <Link href={`/posts/${post.id}`} className="hover:underline">
                          {post.title ?? "Untitled Post"}
                        </Link>
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="size-3" />
                          {post.author_name}
                        </span>
                        {post.assignee_name && (
                          <span className="inline-flex items-center gap-1">
                            Assigned to {post.assignee_name}
                          </span>
                        )}
                        <span>Updated {new Date(post.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isPending && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px]">
                          {post.approval_stage ?? "Pending"}
                        </Badge>
                      )}
                      {post.approval_status === "approved" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[10px]">
                          Approved
                        </Badge>
                      )}
                      {post.approval_status === "changes_requested" && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-[10px]">
                          Changes Requested
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Link href={`/posts/${post.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <FileText className="size-3.5" />
                        View Post
                        <ChevronRight className="size-3" />
                      </Button>
                    </Link>
                    {isPending && canReview && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => quickDecide(post.id, "approved")}
                          disabled={actioning === post.id}
                          className="gap-1.5 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => quickDecide(post.id, "changes_requested")}
                          disabled={actioning === post.id}
                          className="gap-1.5"
                        >
                          <XCircle className="size-3.5" />
                          Request Changes
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
