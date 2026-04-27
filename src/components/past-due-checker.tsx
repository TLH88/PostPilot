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
import { AlertTriangle, CalendarClock, Info, Link2Off } from "lucide-react";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { PublishPreviewDialog } from "@/components/posts/publish-preview-dialog";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { LinkedInConnectDialog } from "@/components/linkedin/connect-dialog";
import { openLinkedInShare } from "@/lib/linkedin";
import { createClient } from "@/lib/supabase/client";

function humanizePublishError(raw: string | null): {
  message: string;
  needsReconnect: boolean;
} {
  if (!raw) return { message: "", needsReconnect: false };
  const lower = raw.toLowerCase();
  if (
    lower.includes("revoked_access_token") ||
    lower.includes("token has been revoked")
  ) {
    return {
      message:
        "LinkedIn disconnected PostPilot, so we couldn't publish. Reconnect LinkedIn in Settings and try again.",
      needsReconnect: true,
    };
  }
  if (lower.includes("expired_access_token") || lower.includes("jwt expired")) {
    return {
      message:
        "Your LinkedIn session expired before we could publish. Reconnect LinkedIn in Settings and try again.",
      needsReconnect: true,
    };
  }
  if (lower.includes("401") || lower.includes("unauthorized")) {
    return {
      message:
        "LinkedIn rejected our authorization. Reconnect LinkedIn in Settings and try again.",
      needsReconnect: true,
    };
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return {
      message:
        "LinkedIn is temporarily rate-limiting this account. Wait a few minutes and try publishing again.",
      needsReconnect: false,
    };
  }
  // Fallback — show a short, generic message. We intentionally do NOT dump
  // the raw JSON to the user.
  return {
    message: "LinkedIn rejected the post. Try publishing again, or reconnect LinkedIn if the issue persists.",
    needsReconnect: false,
  };
}

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
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [authorName, setAuthorName] = useState("Your Name");
  const [authorHeadline, setAuthorHeadline] = useState("Your headline");
  const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);

  const supabase = createClient();

  const checkPastDue = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile for preview
    const { data: profile } = await supabase
      .from("user_profiles")
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

  function handlePublishNow() {
    if (linkedinConnected) {
      // Open preview dialog
      setPublishPreviewOpen(true);
    } else {
      // Fallback to manual share
      openLinkedInShare(current.content, current.hashtags ?? []);
    }
  }

  async function handleReschedule(date: Date) {
    // Security: scoped by id; RLS enforces user ownership. We only touch
    // scheduling fields — never publish directly from this flow.
    await supabase
      .from("posts")
      .update({
        status: "scheduled",
        scheduled_for: date.toISOString(),
        publish_error: null,
      })
      .eq("id", current.id);
    setRescheduleOpen(false);
    moveToNext();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <DialogTitle>A Scheduled Post Failed to Publish to LinkedIn</DialogTitle>
                <DialogDescription>
                  Review the details below and choose how you want to resolve it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* 1. Which post failed */}
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              The post that failed
            </p>
            <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-semibold break-words">{displayTitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {contentSummary}
              </p>
              <p className="text-xs text-muted-foreground">
                Scheduled for: {scheduledDate}
              </p>
            </div>
          </div>

          {/* 2. Root cause + fix */}
          {(() => {
            const humanized = humanizePublishError(current.publish_error);
            // Strong signals of an auth issue — lead with certainty.
            const definitelyAuth = humanized.needsReconnect || !linkedinConnected;
            const isNonAuthError =
              !!current.publish_error && !humanized.needsReconnect;
            const headline = isNonAuthError
              ? "LinkedIn rejected the publish request"
              : definitelyAuth
                ? "LinkedIn needs to be reconnected"
                : "LinkedIn may need to be reconnected";
            const explainer = humanized.needsReconnect
              ? humanized.message
              : isNonAuthError
                ? humanized.message
                : !linkedinConnected
                  ? "PostPilot isn't currently connected to LinkedIn, so auto-publish can't run. Reconnect to restore publishing permissions."
                  : "Auto-publish to LinkedIn failed. The most common cause is that LinkedIn's connection to PostPilot was revoked or became invalid. LinkedIn doesn't notify us when this happens, so we can't always detect it. Reconnect to refresh your publishing permissions.";

            return (
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Likely cause
                </p>
                <div className="rounded-lg border border-red-200 bg-red-50/80 p-3.5 dark:border-red-900/50 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                      <Link2Off className="size-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                          {headline}
                        </p>
                        <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90 break-words">
                          {explainer}
                        </p>
                        <p className="mt-1 text-[11px] text-red-800/70 dark:text-red-300/70">
                          You&apos;ll be sent to LinkedIn to approve PostPilot, then returned here.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setReconnectDialogOpen(true)}
                        className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
                      >
                        <LinkedInIcon className="size-3.5" />
                        Reconnect LinkedIn
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. Explain the action buttons */}
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Your options
            </p>
            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              <span>
                <strong>Reschedule</strong> picks a new date and time.{" "}
                <strong>Publish now</strong> sends it to LinkedIn immediately
                (requires a working connection).{" "}
                <strong>I posted it manually</strong> marks it as posted if you
                already shared it yourself.
              </span>
            </div>
          </div>

          {posts.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">
              Post {currentIndex + 1} of {posts.length}
            </p>
          )}

          <DialogFooter className="flex flex-wrap justify-end gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setRescheduleOpen(true)}
            >
              <CalendarClock className="size-3.5" />
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePublishNow}
            >
              {linkedinConnected ? "Publish now" : "Open LinkedIn"}
            </Button>
            <Button size="sm" onClick={handleConfirmPosted}>
              I posted it manually
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

      {/* Reschedule dialog */}
      <ScheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        onSchedule={handleReschedule}
      />

      {/* BP-136: pre-redirect interstitial when reconnecting LinkedIn */}
      <LinkedInConnectDialog
        open={reconnectDialogOpen}
        onOpenChange={setReconnectDialogOpen}
        reason="revoked"
      />
    </>
  );
}
