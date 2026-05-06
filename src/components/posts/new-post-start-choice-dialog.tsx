"use client";

/**
 * "How do you want to start?" — pre-flight choice dialog for the Create
 * button in the mobile tab bar (BP-099 P2 / owner direction 2026-05-06).
 *
 * Routes the user to one of two flows before any post is created:
 *
 *   1. "Start from an idea" → /ideas?open=generate (Idea Generator)
 *   2. "Start from scratch" → existing NewPostTitleDialog (blank post)
 *
 * Only mounted on the mobile tab bar's Create button. Desktop and mobile
 * Launch Pad cards keep their direct flows because each Launch Pad already
 * exposes both options as separate cards — adding this dialog there would
 * be a redundant extra click.
 */

import { Lightbulb, PenLine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewPostStartChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseGenerate: () => void;
  onChooseScratch: () => void;
}

export function NewPostStartChoiceDialog({
  open,
  onOpenChange,
  onChooseGenerate,
  onChooseScratch,
}: NewPostStartChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How do you want to start?</DialogTitle>
          <DialogDescription>
            Pick the path that fits where you are.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <button
            type="button"
            onClick={onChooseGenerate}
            className="group flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 ring-1 ring-amber-200/50 dark:from-amber-500/20 dark:to-amber-500/5 dark:ring-amber-500/20">
              <Lightbulb className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold">Start from an idea</div>
              <div className="text-sm text-muted-foreground">
                Brainstorm topics with AI, then turn one into a post.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onChooseScratch}
            className="group flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 ring-1 ring-blue-200/50 dark:from-blue-500/20 dark:to-blue-500/5 dark:ring-blue-500/20">
              <PenLine className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold">Start from scratch</div>
              <div className="text-sm text-muted-foreground">
                Type your own title and write the post yourself.
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
