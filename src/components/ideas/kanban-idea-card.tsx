"use client";

/**
 * Kanban card for an Idea (`ideas` table). Lives in the Ideas column.
 *
 * Layout matches the mockup: pillar tag + title + description snippet +
 * edited-time, with three actions at the bottom — Develop (primary),
 * Edit, Archive. Action handlers live in the parent KanbanBoard so the
 * card stays presentational + reusable.
 */

import { ArrowRight, Pencil, Archive, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPillarColor } from "@/lib/pillar-color";
import type { Idea } from "@/types";

interface KanbanIdeaCardProps {
  idea: Idea;
  onDevelop: (idea: Idea) => void;
  onEdit: (idea: Idea) => void;
  onArchive: (id: string) => void;
  developing?: boolean;
}

export function KanbanIdeaCard({
  idea,
  onDevelop,
  onEdit,
  onArchive,
  developing,
}: KanbanIdeaCardProps) {
  const primaryPillar = idea.content_pillars?.[0];
  const c = getPillarColor(primaryPillar);

  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-lg border-l-2 bg-card p-3 transition-colors hover:bg-card",
        c.border.replace("/50", "/70"),
      )}
    >
      {/* Pillar tag */}
      {primaryPillar && (
        <div className={cn("text-[10px] font-bold uppercase tracking-wider", c.text)}>
          {primaryPillar}
        </div>
      )}

      {/* Title */}
      <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">
        {idea.title}
      </h3>

      {/* Description snippet */}
      {idea.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
          {idea.description}
        </p>
      )}

      {/* Meta */}
      <div className="mt-2 text-[10px] text-muted-foreground/80">
        Edited {formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true })}
      </div>

      {/* Actions */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
        <Button
          size="xs"
          className="gap-1"
          onClick={() => onDevelop(idea)}
          disabled={developing}
        >
          {developing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ArrowRight className="size-3" />
          )}
          Develop
        </Button>
        <Button size="xs" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => onEdit(idea)}>
          <Pencil className="size-3" />
          Edit
        </Button>
        <Button
          size="xs"
          variant="ghost"
          className="gap-1 text-muted-foreground hover:text-destructive"
          onClick={() => onArchive(idea.id)}
        >
          <Archive className="size-3" />
          Archive
        </Button>
      </div>
    </div>
  );
}
