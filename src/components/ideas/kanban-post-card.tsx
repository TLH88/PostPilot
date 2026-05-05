"use client";

/**
 * Kanban card for a Post (`posts` table). Used in the Drafting / Ready /
 * Published columns. Action buttons swap based on the post's status:
 *
 *   draft     → Edit · Schedule · Archive
 *   scheduled → Edit · Reschedule · Archive
 *   posted    → View on LinkedIn · Edit & Republish · Archive
 *
 * For posted posts without a LinkedIn URL the View action degrades to a
 * disabled state. All status mutations bubble to the parent KanbanBoard
 * so the board can refetch / reconcile state in one place.
 */

import {
  Pencil,
  CalendarClock,
  Archive,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPillarColor } from "@/lib/pillar-color";
import type { Post } from "@/types";

type PostColumn = "draft" | "scheduled" | "posted";

interface KanbanPostCardProps {
  post: Post;
  /** Which column the card is rendered in (drives the action buttons). */
  column: PostColumn;
  onEdit: (post: Post) => void;
  onSchedule: (post: Post) => void;
  onReschedule: (post: Post) => void;
  onArchive: (id: string) => void;
  onRepublish: (post: Post) => void;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

export function KanbanPostCard({
  post,
  column,
  onEdit,
  onSchedule,
  onReschedule,
  onArchive,
  onRepublish,
}: KanbanPostCardProps) {
  const primaryPillar = post.content_pillars?.[0];
  const c = getPillarColor(primaryPillar);

  const title = post.title?.trim() || "Untitled post";
  const snippet = (post.content ?? "").trim();
  const charCount = (post.content ?? "").length;

  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-lg border-l-2 bg-card p-3 transition-colors hover:bg-card",
        c.border.replace("/50", "/70"),
      )}
    >
      {primaryPillar && (
        <div className={cn("text-[10px] font-bold uppercase tracking-wider", c.text)}>
          {primaryPillar}
        </div>
      )}

      <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">
        {title}
      </h3>

      {snippet && (
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
          {snippet}
        </p>
      )}

      {/* Meta row — left: edited time, right: char count or scheduled time */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/80">
        <span>
          {column === "posted" && post.posted_at
            ? `Posted ${formatDistanceToNow(new Date(post.posted_at), { addSuffix: true })}`
            : `Edited ${formatDistanceToNow(new Date(post.updated_at), { addSuffix: true })}`}
        </span>
        {column === "scheduled" && post.scheduled_for ? (
          <span className="font-medium text-foreground/80">
            ✓ {formatDateShort(post.scheduled_for)}
          </span>
        ) : column === "posted" ? null : (
          <span>{charCount} chars</span>
        )}
      </div>

      {/* Actions — vary by column */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
        {column === "draft" && (
          <>
            <Button size="xs" className="gap-1" onClick={() => onEdit(post)}>
              <Pencil className="size-3" />
              Edit
            </Button>
            <Button size="xs" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => onSchedule(post)}>
              <CalendarClock className="size-3" />
              Schedule
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => onArchive(post.id)}
            >
              <Archive className="size-3" />
              Archive
            </Button>
          </>
        )}

        {column === "scheduled" && (
          <>
            <Button size="xs" className="gap-1" onClick={() => onEdit(post)}>
              <Pencil className="size-3" />
              Edit
            </Button>
            <Button size="xs" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => onReschedule(post)}>
              <CalendarClock className="size-3" />
              Reschedule
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => onArchive(post.id)}
            >
              <Archive className="size-3" />
              Archive
            </Button>
          </>
        )}

        {column === "posted" && (
          <>
            <Button
              size="xs"
              className="gap-1"
              onClick={() => post.linkedin_post_url && window.open(post.linkedin_post_url, "_blank", "noopener,noreferrer")}
              disabled={!post.linkedin_post_url}
              title={post.linkedin_post_url ? undefined : "No LinkedIn URL on file"}
            >
              <ExternalLink className="size-3" />
              View
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => onRepublish(post)}
            >
              <RefreshCw className="size-3" />
              Republish
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => onArchive(post.id)}
            >
              <Archive className="size-3" />
              Archive
            </Button>
          </>
        )}
      </div>

    </div>
  );
}
