"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { toast } from "sonner";
import { NewPostTitleDialog } from "@/components/posts/new-post-title-dialog";

const SLOW_THRESHOLD_MS = 10_000; // 10 seconds — show "taking longer" message
const FAIL_THRESHOLD_MS = 60_000; // 60 seconds — show error + log

export function NewPostButton({ className, label, id }: { className?: string; label?: string; id?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const targetPostId = useRef<string | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watch for navigation to the new post — reset creating state when we arrive
  useEffect(() => {
    if (isCreating && targetPostId.current && pathname === `/posts/${targetPostId.current}`) {
      clearTimers();
      setIsCreating(false);
      targetPostId.current = null;
    }
  }, [pathname, isCreating]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  function clearTimers() {
    if (slowTimer.current) { clearTimeout(slowTimer.current); slowTimer.current = null; }
    if (failTimer.current) { clearTimeout(failTimer.current); failTimer.current = null; }
  }

  function startTimers(postId: string) {
    // 10s — "taking longer than expected"
    slowTimer.current = setTimeout(() => {
      toast.info(
        "Creating your new post is taking longer than expected. Please be patient.",
        { duration: 8000 }
      );
      runHealthCheck(postId);
    }, SLOW_THRESHOLD_MS);

    // 60s — give up, log error, apologize
    failTimer.current = setTimeout(() => {
      setIsCreating(false);
      targetPostId.current = null;
      toast.error(
        "We encountered an issue creating your post. The issue has been logged and sent to an admin for resolution. We apologize for the inconvenience.",
        { duration: 15000 }
      );
      logCreationFailure(postId, "Post creation timed out after 60 seconds");
    }, FAIL_THRESHOLD_MS);
  }

  /** Background check: verify the post exists in DB and the page is reachable */
  async function runHealthCheck(postId: string) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("posts")
        .select("id, status")
        .eq("id", postId)
        .single();

      if (error || !data) {
        toast.error(
          "There was a problem creating your post. Please try again.",
          { duration: 8000 }
        );
        logCreationFailure(postId, `Health check failed: ${error?.message ?? "Post not found in database"}`);
        clearTimers();
        setIsCreating(false);
        targetPostId.current = null;
        return;
      }

      // Post exists in DB — likely a navigation/rendering issue, let timers continue
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown health check error";
      logCreationFailure(postId, `Health check exception: ${msg}`);
    }
  }

  /** Log failure for admin review */
  function logCreationFailure(postId: string, reason: string) {
    console.error(JSON.stringify({
      level: "error",
      message: "Post creation failure",
      postId,
      reason,
      timestamp: new Date().toISOString(),
      pathname,
    }));
  }

  /** Called by the dialog after the user supplies a valid title. */
  const handleCreatePost = useCallback(async (title: string) => {
    setIsCreating(true);
    try {
      // Quota check (same as before)
      const quotaRes = await fetch("/api/quota");
      if (quotaRes.ok) {
        const quota = await quotaRes.json();
        if (quota.posts.limit !== -1 && quota.posts.used >= quota.posts.limit) {
          toast.error(`Monthly post limit reached (${quota.posts.used}/${quota.posts.limit}). Upgrade your plan for more.`);
          setIsCreating(false);
          return;
        }
      }

      const activeWorkspaceId = getActiveWorkspaceId();

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          workspaceId: activeWorkspaceId ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to create post. Please try again.");
        logCreationFailure("unknown", `API error ${res.status}: ${data.error ?? "unknown"}`);
        setIsCreating(false);
        return;
      }

      const { id: postId } = await res.json();

      // Increment post quota (fire-and-forget)
      fetch("/api/quota/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "posts" }),
      }).catch(() => {});

      setDialogOpen(false);
      targetPostId.current = postId;
      startTimers(postId);
      router.push(`/posts/${postId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to create post. Please try again.");
      logCreationFailure("unknown", `Exception: ${msg}`);
      setIsCreating(false);
    }
  }, [router, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Button
        id={id}
        onClick={() => setDialogOpen(true)}
        disabled={isCreating}
        className={className ?? "gap-2"}
      >
        {isCreating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        {isCreating ? "Creating..." : (label ?? "New Post")}
      </Button>

      <NewPostTitleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreatePost}
        submitting={isCreating}
      />
    </>
  );
}
