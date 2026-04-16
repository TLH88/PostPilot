"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  FileText,
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
  compact?: boolean;
  title?: string;
}

export function ActivityFeed({ workspaceId, postId, limit = 20, compact = false, title = "Recent Activity" }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntryWithContext[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={load} className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RefreshCw className="size-3" />
            Refresh
          </button>
        </div>
      )}

      <div className={cn("space-y-0", compact ? "divide-y" : "")}>
        {entries.map((e, i) => {
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
              {!compact && i < entries.length - 1 && (
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
    </div>
  );
}
