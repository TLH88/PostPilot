"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarClock,
  Check,
  ExternalLink,
  Eye,
  FileEdit,
  MoreVertical,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MarkPostedDialog } from "@/components/posts/mark-posted-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { hasFeature } from "@/lib/feature-gate";
import { POST_ACTION_TOOLTIPS } from "@/lib/tooltip-content";
import type { SubscriptionTier } from "@/lib/constants";

interface PostActionsProps {
  postId: string;
  status: string;
  title?: string | null;
  variant?: "dropdown" | "footer";
  userTier?: SubscriptionTier;
  scheduledFor?: string | null;
  onReschedule?: () => void;
  onPostNow?: () => void;
}

function ActionTooltip({ tooltip, children }: { tooltip: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="w-full" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[220px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function PostActions({
  postId,
  status,
  title,
  variant = "dropdown",
  userTier = "free",
  scheduledFor,
  onReschedule,
  onPostNow,
}: PostActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [markPostedOpen, setMarkPostedOpen] = useState(false);
  const [manuallyPostedConfirmOpen, setManuallyPostedConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const canReview = hasFeature(userTier, "review_status");

  async function handleStatusChange(
    e: React.MouseEvent,
    newStatus: string,
    extraUpdates?: Record<string, unknown>
  ) {
    e.preventDefault();
    e.stopPropagation();

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...extraUpdates,
    };

    // Clear scheduled_for when moving back to draft
    if (newStatus === "draft") {
      updates.scheduled_for = null;
    }

    await supabase.from("posts").update(updates).eq("id", postId);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("posts").delete().eq("id", postId);
    setDeleteDialogOpen(false);
    setDeleting(false);
    router.refresh();
  }

  // Footer variant now uses the same dropdown as the default variant
  if (variant === "footer") {
    return (
      <>
        <div className="flex w-full">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="xs"
                  className="gap-1 text-muted-foreground"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                />
              }
            >
              <MoreVertical className="size-3" />
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {/* Post to LinkedIn — opens preview dialog */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (onPostNow) { onPostNow(); } else { router.push(`/posts/${postId}?action=publish`); }
                }}
                disabled={status === "posted" || status === "archived"}
              >
                <Send className="size-4" /> Post to LinkedIn
              </DropdownMenuItem>

              {/* Schedule Post */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (onReschedule) { onReschedule(); } else { router.push(`/posts/${postId}?action=schedule`); }
                }}
                disabled={status === "archived"}
              >
                <CalendarClock className="size-4" /> Schedule Post
              </DropdownMenuItem>

              {/* Move to Review — Team/Enterprise only */}
              {canReview && (
                <DropdownMenuItem
                  onClick={(e) => handleStatusChange(e, "review")}
                  disabled={status === "review" || status === "posted" || status === "archived"}
                >
                  <Eye className="size-4" /> Move to Review
                </DropdownMenuItem>
              )}

              {/* Manually Posted */}
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManuallyPostedConfirmOpen(true); }}
                disabled={status === "posted" || status === "archived"}
              >
                <Check className="size-4" /> Manually Posted
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Archive / Restore */}
              {status !== "archived" ? (
                <DropdownMenuItem onClick={(e) => handleStatusChange(e, "archived")}>
                  <Archive className="size-4" /> Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => handleStatusChange(e, "draft")}>
                  <RotateCcw className="size-4" /> Restore to Draft
                </DropdownMenuItem>
              )}

              {/* Delete */}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteDialogOpen(true); }}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Delete post?</DialogTitle>
              <DialogDescription>
                This will permanently delete this post and all its versions. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manually Posted confirmation dialog */}
        <Dialog open={manuallyPostedConfirmOpen} onOpenChange={setManuallyPostedConfirmOpen}>
          <DialogContent className="sm:max-w-[440px]" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Mark as Manually Posted?</DialogTitle>
              <DialogDescription>
                This means you have already copied and posted this content to LinkedIn on your own, without using PostPilot&apos;s direct publishing feature. The post will be marked as &quot;Posted to LinkedIn&quot; in your workflow.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setManuallyPostedConfirmOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                setManuallyPostedConfirmOpen(false);
                setMarkPostedOpen(true);
              }}>
                Yes, I posted it manually
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark as Posted dialog (URL input) */}
        <MarkPostedDialog
          open={markPostedOpen}
          onOpenChange={setMarkPostedOpen}
          postId={postId}
          postTitle={title}
          onSuccess={() => router.refresh()}
        />
      </>
    );
  }

  // ─── Dropdown Variant ──────────────────────────────────────────────────────
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            />
          }
        >
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {/* Post to LinkedIn — opens preview dialog */}
          <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.postNow.text}>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (onPostNow) { onPostNow(); } else { router.push(`/posts/${postId}?action=publish`); }
              }}
              disabled={status === "posted" || status === "archived"}
            >
              <Send className="size-4" /> Post to LinkedIn
            </DropdownMenuItem>
          </ActionTooltip>

          {/* Schedule Post */}
          <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.reschedule.text}>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (onReschedule) { onReschedule(); } else { router.push(`/posts/${postId}?action=schedule`); }
              }}
              disabled={status === "archived"}
            >
              <CalendarClock className="size-4" /> Schedule Post
            </DropdownMenuItem>
          </ActionTooltip>

          {/* Move to Review — Team/Enterprise only */}
          {canReview && (
            <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.moveToReview.text}>
              <DropdownMenuItem
                onClick={(e) => handleStatusChange(e, "review")}
                disabled={status === "review" || status === "posted" || status === "archived"}
              >
                <Eye className="size-4" /> Move to Review
              </DropdownMenuItem>
            </ActionTooltip>
          )}

          {/* Manually Posted */}
          <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.manuallyPosted.text}>
            <DropdownMenuItem
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManuallyPostedConfirmOpen(true); }}
              disabled={status === "posted" || status === "archived"}
            >
              <Check className="size-4" /> Manually Posted
            </DropdownMenuItem>
          </ActionTooltip>

          <DropdownMenuSeparator />

          {/* Open in Editor */}
          <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.openInEditor.text}>
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/posts/${postId}`); }}>
              <ExternalLink className="size-4" /> Open in Editor
            </DropdownMenuItem>
          </ActionTooltip>

          {/* Archive / Restore */}
          {status !== "archived" ? (
            <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.archive.text}>
              <DropdownMenuItem onClick={(e) => handleStatusChange(e, "archived")}>
                <Archive className="size-4" /> Archive
              </DropdownMenuItem>
            </ActionTooltip>
          ) : (
            <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.restore.text}>
              <DropdownMenuItem onClick={(e) => handleStatusChange(e, "draft")}>
                <RotateCcw className="size-4" /> Restore to Draft
              </DropdownMenuItem>
            </ActionTooltip>
          )}

          {/* Delete */}
          <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.delete.text}>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </ActionTooltip>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This will permanently delete this post and all its versions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manually Posted confirmation dialog */}
      <Dialog open={manuallyPostedConfirmOpen} onOpenChange={setManuallyPostedConfirmOpen}>
        <DialogContent className="sm:max-w-[440px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Mark as Manually Posted?</DialogTitle>
            <DialogDescription>
              This means you have already copied and posted this content to LinkedIn on your own, without using PostPilot&apos;s direct publishing feature. The post will be marked as &quot;Posted to LinkedIn&quot; in your workflow.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setManuallyPostedConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setManuallyPostedConfirmOpen(false);
              setMarkPostedOpen(true);
            }}>
              Yes, I posted it manually
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Posted dialog (URL input) */}
      <MarkPostedDialog
        open={markPostedOpen}
        onOpenChange={setMarkPostedOpen}
        postId={postId}
        postTitle={title}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
