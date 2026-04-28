"use client";

/**
 * BP-145: Publish-Failure Recovery Surface.
 *
 * Single dedicated page for walking the user through every post that failed
 * to publish. Replaces the old global PastDueChecker modal which couldn't
 * survive an OAuth round-trip cleanly. Flow:
 *
 *   1. Fetch all past_due posts for the current user.
 *   2. If `?reconnected=1` is present: force-validate the LinkedIn token
 *      (bypassing the 1-hour throttle), surface explicit success/failure.
 *   3. If `?post=<id>` is present: jump that post to the front of the queue.
 *   4. Walk through each post one at a time. After each action, verify the
 *      action succeeded server-side and show a specific confirmation toast.
 *      Auto-advance to the next post.
 *   5. When the queue empties: redirect to /calendar?recovered=N.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileEdit,
  Info,
  Link2Off,
  Loader2,
  PartyPopper,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { LinkedInConnectDialog } from "@/components/linkedin/connect-dialog";
import { PublishPreviewDialog } from "@/components/posts/publish-preview-dialog";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { createClient } from "@/lib/supabase/client";
import type { PostFailureCategory } from "@/types";

type RecoveryPost = {
  id: string;
  title: string | null;
  content: string;
  hashtags: string[] | null;
  scheduled_for: string;
  publish_error: string | null;
  failure_category: PostFailureCategory | null;
  image_url: string | null;
};

type ValidationResult =
  | { state: "idle" }
  | { state: "validating" }
  | { state: "valid"; cached: boolean }
  | { state: "invalid"; reason: string };

// ─── Failure-category remediation copy ──────────────────────────────────────
// One source of truth for "what does this category mean and what should the
// user do about it?" Keeps the page free of nested ternaries.

type CategoryHandler = {
  headline: string;
  body: string;
  /** "auth" needs a reconnect; "edit" needs the editor; "retry" is just retry; "wait" needs time. */
  primaryAction: "auth" | "edit" | "retry" | "wait" | "manual";
};

const CATEGORY_HANDLERS: Record<PostFailureCategory, CategoryHandler> = {
  linkedin_auth_revoked: {
    headline: "LinkedIn revoked PostPilot's posting permission",
    body: "LinkedIn told us our authorization to post on your behalf is no longer valid — usually because you (or LinkedIn) revoked it. Reconnect to restore publishing.",
    primaryAction: "auth",
  },
  linkedin_auth_expired: {
    headline: "Your LinkedIn authorization expired",
    body: "Your LinkedIn posting authorization expired and we couldn't refresh it automatically. Reconnect to restore publishing.",
    primaryAction: "auth",
  },
  linkedin_rate_limited: {
    headline: "LinkedIn paused us for rate-limiting",
    body: "LinkedIn temporarily limited how often we can post. Wait a few minutes, then try again. Your connection is otherwise healthy.",
    primaryAction: "wait",
  },
  linkedin_content_rejected: {
    headline: "LinkedIn declined this post",
    body: "LinkedIn rejected the post content. Open it in the editor, adjust the content, and try publishing again.",
    primaryAction: "edit",
  },
  linkedin_content_too_long: {
    headline: "Post exceeds LinkedIn's character limit",
    body: "LinkedIn rejected the post because it's too long. Open it in the editor, shorten the content, and try again.",
    primaryAction: "edit",
  },
  linkedin_duplicate: {
    headline: "LinkedIn flagged this as a duplicate",
    body: "LinkedIn detected this content as a duplicate of something you've recently posted. Edit it to make the content unique, then try publishing again.",
    primaryAction: "edit",
  },
  network_transient: {
    headline: "Couldn't reach LinkedIn",
    body: "We hit a temporary network problem talking to LinkedIn. Your connection is otherwise healthy. Try publishing again now.",
    primaryAction: "retry",
  },
  profile_missing: {
    headline: "Your profile data is missing",
    body: "We couldn't load your profile to publish this post. Check that your profile is complete in Settings.",
    primaryAction: "manual",
  },
  token_decrypt_failed: {
    headline: "We couldn't read your stored LinkedIn token",
    body: "The stored authorization token is unreadable — most likely because it was rotated. Reconnect to refresh it.",
    primaryAction: "auth",
  },
  unknown: {
    headline: "Something unexpected went wrong publishing this post",
    body: "We don't have a clean explanation for this failure. Try publishing again, or reconnect LinkedIn if it persists.",
    primaryAction: "retry",
  },
};

/**
 * Fallback for legacy past_due rows where failure_category is NULL (rows
 * written before BP-145). Reads the raw publish_error text and guesses.
 */
function fallbackCategoryFromError(raw: string | null): PostFailureCategory {
  if (!raw) return "unknown";
  const m = raw.toLowerCase();
  if (m.includes("revoked_access_token") || m.includes("token has been revoked"))
    return "linkedin_auth_revoked";
  if (m.includes("expired_access_token") || m.includes("jwt expired"))
    return "linkedin_auth_expired";
  if (m.includes("401") || m.includes("unauthorized") || m.includes("403"))
    return "linkedin_auth_revoked";
  if (m.includes("429") || m.includes("rate limit") || m.includes("throttle"))
    return "linkedin_rate_limited";
  if (m.includes("too long") || m.includes("content_too_long"))
    return "linkedin_content_too_long";
  if (m.includes("duplicate")) return "linkedin_duplicate";
  if (m.includes("422")) return "linkedin_content_rejected";
  if (
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("fetch failed") ||
    m.includes("network")
  )
    return "network_transient";
  return "unknown";
}

function getCategoryFor(post: RecoveryPost): PostFailureCategory {
  return post.failure_category ?? fallbackCategoryFromError(post.publish_error);
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function PostsRecoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PostsRecoveryInner />
    </Suspense>
  );
}

function PostsRecoveryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [posts, setPosts] = useState<RecoveryPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [validation, setValidation] = useState<ValidationResult>({
    state: "idle",
  });
  const [authorName, setAuthorName] = useState("Your Name");
  const [authorHeadline, setAuthorHeadline] = useState("Your headline");
  const [publishPreviewOpen, setPublishPreviewOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);

  const reconnectedFlag = searchParams.get("reconnected");
  const initialPostParam = searchParams.get("post");

  // ── Initial data fetch ─────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    // Profile (for LinkedIn preview header)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, headline")
      .eq("user_id", user.id)
      .single();
    if (profile?.full_name) setAuthorName(profile.full_name);
    if (profile?.headline) setAuthorHeadline(profile.headline);

    // Past-due posts. We deliberately exclude scheduled-but-overdue rows here
    // (those still get retried by the Edge Function); the recovery surface is
    // for posts that have given up retrying (status = 'past_due').
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, content, hashtags, scheduled_for, publish_error, failure_category, image_url"
      )
      .eq("user_id", user.id)
      .eq("status", "past_due")
      .order("scheduled_for", { ascending: true });

    if (error) {
      toast.error("Couldn't load failed posts. Please refresh.");
      setPosts([]);
      setLoading(false);
      return;
    }

    let list = (data ?? []) as RecoveryPost[];

    // Bring the post that triggered the recovery to the front.
    if (initialPostParam) {
      const idx = list.findIndex((p) => p.id === initialPostParam);
      if (idx > 0) {
        const [front] = list.splice(idx, 1);
        list = [front, ...list];
      }
    }

    setPosts(list);
    setCurrentIndex(0);
    setLoading(false);
  }, [supabase, router, initialPostParam]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // ── Force-validate after OAuth round-trip ─────────────────────────────────
  useEffect(() => {
    if (!reconnectedFlag) return;
    if (reconnectedFlag === "error") {
      setValidation({ state: "invalid", reason: "oauth_error" });
      return;
    }
    if (reconnectedFlag !== "1") return;

    let cancelled = false;
    setValidation({ state: "validating" });
    (async () => {
      try {
        const res = await fetch("/api/linkedin/validate?force=1", {
          method: "POST",
        });
        if (cancelled) return;
        if (!res.ok) {
          setValidation({ state: "invalid", reason: "request_failed" });
          return;
        }
        const data = (await res.json()) as
          | { valid: true; cached?: boolean }
          | { valid: false; reason: string };
        if (data.valid) {
          setValidation({ state: "valid", cached: !!data.cached });
        } else {
          setValidation({ state: "invalid", reason: data.reason });
        }
      } catch {
        if (!cancelled) setValidation({ state: "invalid", reason: "network" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reconnectedFlag]);

  // Strip ?reconnected and ?post from the URL after we've consumed them so a
  // refresh doesn't re-fire validation.
  useEffect(() => {
    if (!reconnectedFlag && !initialPostParam) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("reconnected");
    url.searchParams.delete("post");
    window.history.replaceState({}, "", url.toString());
  }, [reconnectedFlag, initialPostParam]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const current = posts[currentIndex];

  function moveToNext(opts?: { recovered?: boolean }) {
    if (opts?.recovered) {
      setRecoveredCount((n) => n + 1);
    }
    if (currentIndex < posts.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Queue empty — ship the user to Calendar with the success-count param.
      const total = (opts?.recovered ? 1 : 0) + recoveredCount;
      router.push(`/calendar?recovered=${total}`);
    }
  }

  async function handleReschedule(date: Date) {
    if (!current) return;
    const { error } = await supabase
      .from("posts")
      .update({
        status: "scheduled",
        scheduled_for: date.toISOString(),
        publish_error: null,
        failure_category: null,
        publish_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    setRescheduleOpen(false);
    if (error) {
      toast.error("Couldn't reschedule that post — please try again.");
      return;
    }
    toast.success(
      `Rescheduled for ${format(date, "EEE MMM d, yyyy 'at' h:mm a")}`
    );
    moveToNext({ recovered: true });
  }

  async function handleManuallyPosted() {
    if (!current) return;
    const { error } = await supabase
      .from("posts")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        publish_method: "manual",
        publish_error: null,
        failure_category: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    if (error) {
      toast.error("Couldn't update that post — please try again.");
      return;
    }
    toast.success("Marked as manually posted.");
    moveToNext({ recovered: true });
  }

  function handleEditInEditor() {
    if (!current) return;
    router.push(`/posts/${current.id}`);
  }

  function handleApproveAndPost() {
    if (validation.state === "valid") {
      setPublishPreviewOpen(true);
    } else if (validation.state === "validating") {
      toast.info("Verifying your LinkedIn connection — try again in a moment.");
    } else {
      // No connection — open reconnect dialog with recovery context so the
      // round-trip lands back here with the same post pre-selected.
      setReconnectDialogOpen(true);
    }
  }

  // ── Loading + empty states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recovery</h1>
          <p className="text-muted-foreground">
            Posts that failed to publish show up here so you can resolve them.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <PartyPopper className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="mt-4 text-base font-semibold">All caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You don&apos;t have any failed posts to recover right now.
            </p>
            <Button
              className="mt-6 gap-1.5"
              onClick={() => router.push("/calendar")}
            >
              Back to Calendar
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        {validation.state === "valid" && reconnectedFlag === "1" && (
          <ConnectionConfirmation cached={validation.cached} />
        )}
      </div>
    );
  }

  if (!current) return null;

  const category = getCategoryFor(current);
  const handler = CATEGORY_HANDLERS[category];
  const displayTitle =
    current.title ||
    (current.content
      ? current.content.slice(0, 60) +
        (current.content.length > 60 ? "..." : "")
      : "Untitled Post");
  const contentPreview =
    current.content.length > 220
      ? current.content.slice(0, 220) + "..."
      : current.content;
  const scheduledLabel = format(
    new Date(current.scheduled_for),
    "EEE MMM d, yyyy 'at' h:mm a"
  );

  // Build the "where to send the user back to after reconnect" URL: same page,
  // same post, with the reconnected flag.
  const recoveryReturnTo = `/posts/recovery`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Recover failed posts
        </h1>
        <p className="text-muted-foreground">
          We&apos;ll walk you through each post that didn&apos;t publish. Pick
          how you want to resolve each one.
        </p>
      </div>

      {/* Connection-status banner — only after a reconnect round-trip */}
      {reconnectedFlag === "1" && (
        <ValidationBanner validation={validation} authorName={authorName} />
      )}
      {reconnectedFlag === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                Reconnect didn&apos;t complete
              </p>
              <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90">
                Something went wrong on the LinkedIn round-trip. Try the
                Reconnect button below to start over.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Walkthrough card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base">
                  Failed to publish to LinkedIn
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review what happened and pick how to resolve it.
                </p>
              </div>
            </div>
            {posts.length > 1 && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {currentIndex + 1} of {posts.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {/* The post */}
          <section className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              The post that failed
            </p>
            <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-semibold break-words">
                {displayTitle}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {contentPreview}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                Scheduled for {scheduledLabel}
              </p>
            </div>
          </section>

          {/* Root cause */}
          <section className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Root cause
            </p>
            <div className="rounded-lg border border-red-200 bg-red-50/80 p-3.5 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <Link2Off className="size-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                      {handler.headline}
                    </p>
                    <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90 break-words">
                      {handler.body}
                    </p>
                  </div>
                  {handler.primaryAction === "auth" &&
                    validation.state !== "valid" && (
                      <Button
                        size="sm"
                        onClick={() => setReconnectDialogOpen(true)}
                        className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
                      >
                        <LinkedInIcon className="size-3.5" />
                        Reconnect LinkedIn
                      </Button>
                    )}
                </div>
              </div>
            </div>
          </section>

          {/* Action explainer */}
          <section className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Your options
            </p>
            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              <span>
                <strong>Approve &amp; post</strong> publishes immediately to
                LinkedIn. <strong>Reschedule</strong> picks a new date and
                time. <strong>Open in editor</strong> takes you to the post to
                make changes. <strong>I posted it manually</strong> marks it
                done if you already shared it yourself.
              </span>
            </div>
          </section>
        </CardContent>

        {/* Action row */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3">
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
            className="gap-1.5"
            onClick={handleEditInEditor}
          >
            <FileEdit className="size-3.5" />
            Open in editor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManuallyPosted}
          >
            I posted it manually
          </Button>
          <Button
            size="sm"
            onClick={handleApproveAndPost}
            className="gap-1.5 bg-[#0A66C2] text-white hover:bg-[#004182]"
            disabled={validation.state === "validating"}
          >
            <LinkedInIcon className="size-3.5" />
            {validation.state === "validating"
              ? "Verifying…"
              : "Approve & post"}
          </Button>
        </div>
      </Card>

      {/* Footer hint */}
      <p className="text-center text-xs text-muted-foreground">
        Once every post is resolved, we&apos;ll take you back to the calendar.
      </p>

      {/* Publish preview dialog (Approve & post) */}
      <PublishPreviewDialog
        open={publishPreviewOpen}
        onOpenChange={setPublishPreviewOpen}
        postId={current.id}
        title={current.title}
        content={current.content}
        hashtags={current.hashtags ?? []}
        imageUrl={current.image_url}
        authorName={authorName}
        authorHeadline={authorHeadline}
        showEditorLink={false}
        onPublished={(result) => {
          toast.success(
            <span>
              Published to LinkedIn.{" "}
              <a
                href={result.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                View post
              </a>
            </span>
          );
          // Clear failure_category alongside the publish — the API route
          // handles publish_error already, but failure_category is BP-145.
          supabase
            .from("posts")
            .update({ failure_category: null })
            .eq("id", current.id)
            .then(() => undefined);
          moveToNext({ recovered: true });
        }}
        onTokenExpired={() => {
          // Token went stale between validate and publish — re-show reconnect.
          setValidation({ state: "invalid", reason: "expired_during_publish" });
          setPublishPreviewOpen(false);
          toast.error(
            "LinkedIn rejected the token mid-publish. Reconnect and try again."
          );
        }}
      />

      {/* Reschedule dialog */}
      <ScheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        onSchedule={handleReschedule}
      />

      {/* Reconnect interstitial — passes recovery context so the OAuth
          round-trip lands back on this page with this post selected. */}
      <LinkedInConnectDialog
        open={reconnectDialogOpen}
        onOpenChange={setReconnectDialogOpen}
        reason="revoked"
        returnTo={recoveryReturnTo}
        recoverPostId={current.id}
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ValidationBanner({
  validation,
  authorName,
}: {
  validation: ValidationResult;
  authorName: string;
}) {
  if (validation.state === "validating") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <div className="flex items-start gap-3">
          <Loader2 className="size-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Verifying your LinkedIn connection…
            </p>
            <p className="mt-1 text-xs text-blue-800/90 dark:text-blue-300/90">
              Confirming the new authorization works before unlocking publish.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (validation.state === "valid") {
    return <ConnectionConfirmation cached={validation.cached} authorName={authorName} />;
  }

  if (validation.state === "invalid") {
    const detail =
      validation.reason === "revoked"
        ? "LinkedIn says the token isn't authorized. Try the Reconnect button below."
        : validation.reason === "refresh_failed"
          ? "We couldn't refresh the token. Try the Reconnect button below."
          : "We couldn't verify your LinkedIn connection. Try the Reconnect button below.";
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">
              Reconnect didn&apos;t verify
            </p>
            <p className="mt-1 text-xs text-red-800/90 dark:text-red-300/90">
              {detail}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ConnectionConfirmation({
  cached,
  authorName,
}: {
  cached?: boolean;
  authorName?: string;
}) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50/80 p-4 dark:border-green-900/50 dark:bg-green-950/30">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-green-900 dark:text-green-200">
            Reconnected to LinkedIn{authorName ? ` as ${authorName}` : ""}
          </p>
          <p className="mt-1 text-xs text-green-800/90 dark:text-green-300/90">
            {cached
              ? "Your authorization is healthy."
              : "We verified the new authorization with LinkedIn just now."}
          </p>
        </div>
      </div>
    </div>
  );
}
