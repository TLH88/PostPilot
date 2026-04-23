"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  MessageCircle,
  UserPlus,
  UserX,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  Archive,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry } from "@/types";

interface ActivityEntryWithContext extends ActivityLogEntry {
  actor_name?: string;
  post_title?: string | null;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  post_created: FileText,
  post_edited: RefreshCw,
  post_commented: MessageCircle,
  post_assigned: UserPlus,
  post_unassigned: UserX,
  post_status_changed: RefreshCw,
  post_submitted_for_review: Activity,
  post_approved: CheckCircle2,
  post_changes_requested: XCircle,
  post_scheduled: Calendar,
  post_published: Sparkles,
  post_archived: Archive,
  member_joined: UserPlus,
  member_left: UserX,
};

const ACTION_COLORS: Record<string, string> = {
  post_created: "text-blue-500 bg-blue-500/10",
  post_edited: "text-gray-500 bg-gray-500/10",
  post_commented: "text-amber-500 bg-amber-500/10",
  post_assigned: "text-purple-500 bg-purple-500/10",
  post_unassigned: "text-gray-400 bg-gray-400/10",
  post_status_changed: "text-indigo-500 bg-indigo-500/10",
  post_submitted_for_review: "text-cyan-500 bg-cyan-500/10",
  post_approved: "text-emerald-500 bg-emerald-500/10",
  post_changes_requested: "text-red-500 bg-red-500/10",
  post_scheduled: "text-purple-500 bg-purple-500/10",
  post_published: "text-green-500 bg-green-500/10",
  post_archived: "text-gray-500 bg-gray-500/10",
  member_joined: "text-green-500 bg-green-500/10",
  member_left: "text-gray-500 bg-gray-500/10",
};

const ACTION_LABELS: Record<string, string> = {
  post_created: "created",
  post_edited: "edited",
  post_commented: "commented on",
  post_assigned: "assigned",
  post_unassigned: "unassigned",
  post_status_changed: "changed status of",
  post_submitted_for_review: "submitted for review",
  post_approved: "approved",
  post_changes_requested: "requested changes on",
  post_scheduled: "scheduled",
  post_published: "published",
  post_archived: "archived",
  member_joined: "joined the workspace",
  member_left: "left the workspace",
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ActivityFeedProps {
  workspaceId?: string | null;
  postId?: string | null;
  limit?: number;
  /**
   * When set, only the first `previewLimit` entries are shown in the card
   * and a "View all" button opens a paginated modal showing the full feed.
   */
  previewLimit?: number;
  compact?: boolean;
  title?: string;
}

const MODAL_PAGE_SIZE = 25;

export function ActivityFeed({ workspaceId, postId, limit = 20, previewLimit, compact = false, title = "Recent Activity" }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntryWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [viewAllOpen, setViewAllOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (workspaceId) params.set("workspaceId", workspaceId);
      if (postId) params.set("postId", postId);
      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotalCount(typeof data.total === "number" ? data.total : (data.entries?.length ?? 0));
    } catch (error) {
      // BP-095: surface failures (HTTP errors, parse errors, network issues).
      // The empty state below will tell the user there's nothing to show; this
      // log distinguishes "no activity yet" from "API call failed."
      console.warn("[activity-feed] failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, postId, limit]);

  useEffect(() => { load(); }, [load]);

  const visibleEntries =
    typeof previewLimit === "number" ? entries.slice(0, previewLimit) : entries;
  const hasMore =
    typeof previewLimit === "number" &&
    (totalCount > previewLimit || entries.length > previewLimit);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">{title}</h3>
        <div className="text-xs text-muted-foreground text-center py-8">Loading...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="size-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card", !compact && "p-4")}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {title}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={`About ${title}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-sm">
                  A running log of what&apos;s happened in your workspace recently — posts created, edited, scheduled, published, and more. Useful for picking up where you left off.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          <button onClick={load} className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RefreshCw className="size-3" />
            Refresh
          </button>
        </div>
      )}

      <div className={cn("space-y-0", compact ? "divide-y" : "")}>
        {visibleEntries.map((e, i) => {
          const Icon = ACTION_ICONS[e.action] ?? Activity;
          const colorClass = ACTION_COLORS[e.action] ?? "text-gray-500 bg-gray-500/10";
          const actionLabel = ACTION_LABELS[e.action] ?? e.action;
          return (
            <div
              key={e.id}
              className={cn(
                "flex items-start gap-2.5",
                compact ? "p-3" : "py-2 relative",
              )}
            >
              {!compact && i < visibleEntries.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-[-8px] w-px bg-border" />
              )}
              <div className={cn("flex size-[30px] items-center justify-center rounded-full shrink-0 relative z-10", colorClass)}>
                <Icon className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs leading-relaxed">
                  <span className="font-medium">{e.actor_name ?? "Someone"}</span>
                  <span className="text-muted-foreground"> {actionLabel} </span>
                  {e.post_id && e.post_title && (
                    <Link href={`/posts/${e.post_id}`} className="font-medium text-primary hover:underline">
                      &quot;{e.post_title}&quot;
                    </Link>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(e.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setViewAllOpen(true)}
          className="mt-3 w-full text-center text-xs font-medium text-primary hover:underline"
        >
          View all activity
        </button>
      )}

      {hasMore && (
        <ActivityFeedModal
          open={viewAllOpen}
          onOpenChange={setViewAllOpen}
          workspaceId={workspaceId}
          postId={postId}
          title={title}
        />
      )}
    </div>
  );
}

// ─── View-all modal ───────────────────────────────────────────────────────────

interface ActivityFeedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string | null;
  postId?: string | null;
  title: string;
}

function ActivityFeedModal({ open, onOpenChange, workspaceId, postId, title }: ActivityFeedModalProps) {
  const [entries, setEntries] = useState<ActivityEntryWithContext[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(MODAL_PAGE_SIZE),
        offset: String(nextPage * MODAL_PAGE_SIZE),
      });
      if (workspaceId) params.set("workspaceId", workspaceId);
      if (postId) params.set("postId", postId);
      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(typeof data.total === "number" ? data.total : (data.entries?.length ?? 0));
    } catch (error) {
      console.warn("[activity-feed] modal load failed:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, postId]);

  useEffect(() => {
    if (!open) return;
    load(page);
  }, [open, page, load]);

  // Reset to page 0 whenever the modal opens fresh.
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  const totalPages = Math.max(1, Math.ceil(total / MODAL_PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-8">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="size-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No activity on this page</p>
            </div>
          ) : (
            <div className="space-y-0">
              {entries.map((e, i) => {
                const Icon = ACTION_ICONS[e.action] ?? Activity;
                const colorClass = ACTION_COLORS[e.action] ?? "text-gray-500 bg-gray-500/10";
                const actionLabel = ACTION_LABELS[e.action] ?? e.action;
                return (
                  <div key={e.id} className="flex items-start gap-2.5 py-2 relative">
                    {i < entries.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-[-8px] w-px bg-border" />
                    )}
                    <div className={cn("flex size-[30px] items-center justify-center rounded-full shrink-0 relative z-10", colorClass)}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-xs leading-relaxed">
                        <span className="font-medium">{e.actor_name ?? "Someone"}</span>
                        <span className="text-muted-foreground"> {actionLabel} </span>
                        {e.post_id && e.post_title && (
                          <Link
                            href={`/posts/${e.post_id}`}
                            className="font-medium text-primary hover:underline"
                            onClick={() => onOpenChange(false)}
                          >
                            &quot;{e.post_title}&quot;
                          </Link>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(e.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            {total === 0
              ? "0 entries"
              : `${page * MODAL_PAGE_SIZE + 1}–${Math.min((page + 1) * MODAL_PAGE_SIZE, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <span className="tabular-nums">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!canNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
