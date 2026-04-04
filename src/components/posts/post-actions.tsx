"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  Eye,
  FileEdit,
  MoreVertical,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { createClient } from "@/lib/supabase/client";

interface PostActionsProps {
  postId: string;
  status: string;
  title?: string | null;
  variant?: "dropdown" | "footer";
}

export function PostActions({ postId, status, title, variant = "dropdown" }: PostActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [markPostedOpen, setMarkPostedOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

  // Determine which status actions to show
  const statusActions = getStatusActions(status);

  if (variant === "footer") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-1 w-full">
          {/* Status actions as buttons */}
          {statusActions.filter((a) => a.action !== "mark_posted").map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="xs"
              onClick={(e) => handleStatusChange(e, action.targetStatus!)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}

          {/* Archive / Restore */}
          {status !== "archived" ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => handleStatusChange(e, "archived")}
            >
              <Archive className="size-3" />
              Archive
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => handleStatusChange(e, "draft")}
            >
              <RotateCcw className="size-3" />
              Restore
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
            <Trash2 className="size-3" />
            Delete
          </Button>

          {/* Manually Posted — pushed to far right */}
          {statusActions.some((a) => a.action === "mark_posted") && (
            <>
              <div className="flex-1" />
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMarkPostedOpen(true);
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
          <DialogContent
            className="sm:max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>Delete post?</DialogTitle>
              <DialogDescription>
                This will permanently delete this post and all its versions. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark as Posted dialog */}
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          }
        >
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Status change actions */}
          {statusActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={(e) => {
                if (action.action === "mark_posted") {
                  e.preventDefault();
                  e.stopPropagation();
                  setMarkPostedOpen(true);
                } else {
                  handleStatusChange(e, action.targetStatus!);
                }
              }}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}

          {statusActions.length > 0 && <DropdownMenuSeparator />}

          {/* Archive / Restore */}
          {status !== "archived" ? (
            <DropdownMenuItem
              onClick={(e) => handleStatusChange(e, "archived")}
            >
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={(e) => handleStatusChange(e, "draft")}>
              <RotateCcw className="size-4" />
              Restore to Draft
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Delete */}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          className="sm:max-w-[400px]"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This will permanently delete this post and all its versions. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Posted dialog */}
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

/** Returns the status-specific menu actions for a given post status */
function getStatusActions(status: string) {
  const actions: {
    label: string;
    icon: React.ReactNode;
    targetStatus?: string;
    action?: string;
  }[] = [];

  switch (status) {
    case "draft":
      actions.push({
        label: "Move to Review",
        icon: <Eye className="size-4" />,
        targetStatus: "review",
      });
      actions.push({
        label: "Mark as Posted",
        icon: <Check className="size-4" />,
        action: "mark_posted",
      });
      break;
    case "review":
      actions.push({
        label: "Back to Draft",
        icon: <FileEdit className="size-4" />,
        targetStatus: "draft",
      });
      actions.push({
        label: "Mark as Posted",
        icon: <Check className="size-4" />,
        action: "mark_posted",
      });
      break;
    case "scheduled":
      actions.push({
        label: "Back to Draft",
        icon: <FileEdit className="size-4" />,
        targetStatus: "draft",
      });
      actions.push({
        label: "Mark as Posted",
        icon: <Check className="size-4" />,
        action: "mark_posted",
      });
      break;
    case "past_due":
      actions.push({
        label: "Back to Draft",
        icon: <FileEdit className="size-4" />,
        targetStatus: "draft",
      });
      actions.push({
        label: "Mark as Posted",
        icon: <Check className="size-4" />,
        action: "mark_posted",
      });
      break;
    // "posted" and "archived" have no additional status actions
    // (Archive/Restore already handled separately)
  }

  return actions;
}
