"use client";

/**
 * Picker shown when the user clicks "+ Promote draft" at the bottom of
 * the Ready column. Lists every current draft post; selecting one opens
 * it in the editor so the user can finalize and schedule.
 *
 * The list is passed in by the parent (KanbanBoard) — this dialog stays
 * pure presentational so it doesn't need to refetch on open.
 */

import { useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getPillarColor } from "@/lib/pillar-color";
import type { Post } from "@/types";

interface PromoteDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: Post[];
}

export function PromoteDraftDialog({
  open,
  onOpenChange,
  drafts,
}: PromoteDraftDialogProps) {
  const router = useRouter();

  function handlePick(post: Post) {
    onOpenChange(false);
    router.push(`/posts/${post.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Promote a draft</DialogTitle>
          <DialogDescription>
            Open a draft in the editor to finalize it and schedule for publishing.
          </DialogDescription>
        </DialogHeader>

        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <FileText className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No drafts yet</p>
            <p className="max-w-[280px] text-xs text-muted-foreground">
              Develop an idea or add a new draft to get started.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
            {drafts.map((d) => {
              const pillar = d.content_pillars?.[0];
              const c = getPillarColor(pillar);
              const title = d.title?.trim() || "Untitled draft";
              const snippet = (d.content ?? "").trim();
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handlePick(d)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg border-l-2 border-l-transparent bg-card/40 p-3 text-left transition-colors hover:bg-accent",
                    c.border.replace("/50", "/70"),
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {pillar && (
                      <div className={cn("text-[10px] font-bold uppercase tracking-wider", c.text)}>
                        {pillar}
                      </div>
                    )}
                    <div className="mt-0.5 truncate text-sm font-semibold">
                      {title}
                    </div>
                    {snippet && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {snippet}
                      </p>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground/80">
                      Edited {formatDistanceToNow(new Date(d.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
