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

  if (variant === "footer") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-1 w-full">
          {/* Status actions */}
          {(status === "review" || status === "scheduled" || status === "past_due" || status === "posted") && (
            <Button variant="ghost" size="xs" onClick={(e) => handleStatusChange(e, "draft")}>
              <FileEdit className="size-3" /> Back to Draft
            </Button>
          )}
          {status === "draft" && canReview && (
            <Button variant="ghost" size="xs" onClick={(e) => handleStatusChange(e, "review")}>
              <Eye className="size-3" /> Move to Review
            </Button>
          )}

          {/* Archive / Restore */}
          {status !== "archived" ? (
            <Button variant="ghost" size="xs" onClick={(e) => handleStatusChange(e, "archived")}>
              <Archive className="size-3" /> Archive
            </Button>
          ) : (
            <Button variant="ghost" size="xs" onClick={(e) => handleStatusChange(e, "draft")}>
              <RotateCcw className="size-3" /> Restore
            </Button>
          )}

          {/* Delete */}
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="size-3" /> Delete
          </Button>

          {/* Manually Posted — pushed to far right */}
          {["draft", "review", "scheduled", "past_due"].includes(status) && (
            <>
              <div className="flex-1" />
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setManuallyPostedConfirmOpen(true);
                }}
              >
                <Check className="size-3" />
                Manually Posted
              </button>
            </>
          )}
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
          {/* ── Status ── */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</DropdownMenuLabel>
            {(status === "review" || status === "scheduled" || status === "past_due" || status === "posted") && (
              <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.backToDraft.text}>
                <DropdownMenuItem onClick={(e) => handleStatusChange(e, "draft")}>
                  <FileEdit className="size-4" /> Back to Draft
                </DropdownMenuItem>
              </ActionTooltip>
            )}
            {status === "draft" && canReview && (
              <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.moveToReview.text}>
                <DropdownMenuItem onClick={(e) => handleStatusChange(e, "review")}>
                  <Eye className="size-4" /> Move to Review
                </DropdownMenuItem>
              </ActionTooltip>
            )}
            {status === "posted" && onReschedule && (
              <ActionTooltip tooltip="Schedule this post for republishing at a future date and time">
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReschedule(); }}>
                  <CalendarClock className="size-4" /> Schedule
                </DropdownMenuItem>
              </ActionTooltip>
            )}
          </DropdownMenuGroup>

          {/* ── Publishing ── */}
          {["draft", "review", "scheduled", "past_due"].includes(status) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Publishing</DropdownMenuLabel>
                {(status === "scheduled" || status === "past_due") && onReschedule && (
                  <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.reschedule.text}>
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReschedule(); }}>
                      <CalendarClock className="size-4" /> Reschedule
                    </DropdownMenuItem>
                  </ActionTooltip>
                )}
                {(status === "scheduled" || status === "past_due") && onPostNow && (
                  <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.postNow.text}>
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPostNow(); }}>
                      <Send className="size-4" /> Post Now
                    </DropdownMenuItem>
                  </ActionTooltip>
                )}
                <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.manuallyPosted.text}>
                  <DropdownMenuItem onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setManuallyPostedConfirmOpen(true);
                  }}>
                    <Check className="size-4" /> Manually Posted
                  </DropdownMenuItem>
                </ActionTooltip>
              </DropdownMenuGroup>
            </>
          )}

          {/* ── Management ── */}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Management</DropdownMenuLabel>
            <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.openInEditor.text}>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/posts/${postId}`); }}>
                <ExternalLink className="size-4" /> Open in Editor
              </DropdownMenuItem>
            </ActionTooltip>
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
            <ActionTooltip tooltip={POST_ACTION_TOOLTIPS.delete.text}>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteDialogOpen(true); }}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </ActionTooltip>
          </DropdownMenuGroup>
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
