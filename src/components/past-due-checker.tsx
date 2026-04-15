"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { PublishPreviewDialog } from "@/components/posts/publish-preview-dialog";
import { openLinkedInShare } from "@/lib/linkedin";
import { createClient } from "@/lib/supabase/client";

interface PastDuePost {
  id: string;
  title: string | null;
  content: string;
  hashtags: string[];
  scheduled_for: string;
  publish_error: string | null;
}

export function PastDueChecker() {
  const [posts, setPosts] = useState<PastDuePost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [publishPreviewOpen, setPublishPreviewOpen] = useState(false);
  const [authorName, setAuthorName] = useState("Your Name");
  const [authorHeadline, setAuthorHeadline] = useState("Your headline");

  const supabase = createClient();

  const checkPastDue = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile for preview
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("full_name, headline")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      if (profile.full_name) setAuthorName(profile.full_name);
      if (profile.headline) setAuthorHeadline(profile.headline);
    }

    const { data } = await supabase
      .from("posts")
      .select("id, title, content, hashtags, scheduled_for, publish_error")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .lt("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true });

    // Also check for posts already marked past_due
    const { data: pastDueData } = await supabase
      .from("posts")
      .select("id, title, content, hashtags, scheduled_for, publish_error")
      .eq("user_id", user.id)
      .eq("status", "past_due")
      .order("scheduled_for", { ascending: true });

    const allPosts = [...(data ?? []), ...(pastDueData ?? [])];

    if (allPosts.length > 0) {
      setPosts(allPosts);
      setCurrentIndex(0);
      setOpen(true);
    }
  }, [supabase]);

  // Check LinkedIn connection status on mount
  useEffect(() => {
    fetch("/api/linkedin/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.connected && !data.expired) {
          setLinkedinConnected(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    checkPastDue();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkPastDue();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkPastDue]);

  const current = posts[currentIndex];
  if (!current) return null;

  const displayTitle =
    current.title ||
    (current.content
      ? current.content.slice(0, 60) + (current.content.length > 60 ? "..." : "")
      : "Untitled Post");

  const contentSummary =
    current.content.length > 150
      ? current.content.slice(0, 150) + "..."
      : current.content;

  const scheduledDate = new Date(current.scheduled_for).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  function moveToNext() {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setOpen(false);
    }
  }

  async function handleConfirmPosted() {
    await supabase
      .from("posts")
      .update({ status: "posted", posted_at: new Date().toISOString(), publish_method: "manual" })
      .eq("id", current.id);
    moveToNext();
  }

  async function handleNotYet() {
    await supabase
      .from("posts")
      .update({ status: "past_due" })
      .eq("id", current.id);
    moveToNext();
  }

  function handlePublishNow() {
    if (linkedinConnected) {
      // Open preview dialog
      setPublishPreviewOpen(true);
    } else {
      // Fallback to manual share
      openLinkedInShare(current.content, current.hashtags ?? []);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Scheduled Post Past Due</DialogTitle>
            <DialogDescription>
              This post was scheduled for {scheduledDate}. Did you post it to
              LinkedIn?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium">{displayTitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {contentSummary}
            </p>
            <p className="text-xs text-muted-foreground">
              Scheduled: {scheduledDate}
            </p>
            {current.publish_error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                <span>Auto-publish failed: {current.publish_error}</span>
              </div>
            )}
          </div>

          {posts.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">
              Post {currentIndex + 1} of {posts.length}
            </p>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleNotYet}>
              Not yet
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePublishNow}
            >
              <LinkedInIcon className="size-3.5 text-[#0A66C2]" />
              {linkedinConnected ? "Publish to LinkedIn now" : "Post to LinkedIn now"}
            </Button>
            <Button onClick={handleConfirmPosted}>
              Yes, I posted it to LinkedIn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish preview dialog */}
      <PublishPreviewDialog
        open={publishPreviewOpen}
        onOpenChange={setPublishPreviewOpen}
        postId={current.id}
        title={current.title}
        content={current.content}
        hashtags={current.hashtags ?? []}
        authorName={authorName}
        authorHeadline={authorHeadline}
        showEditorLink
        onPublished={() => moveToNext()}
        onTokenExpired={() => setLinkedinConnected(false)}
      />
    </>
  );
}
