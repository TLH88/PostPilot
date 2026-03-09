"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, MoreVertical, Trash2, RotateCcw } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";

interface PostActionsProps {
  postId: string;
  status: string;
}

export function PostActions({ postId, status }: PostActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleArchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await supabase
      .from("posts")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", postId);
    router.refresh();
  }

  async function handleRestore(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await supabase
      .from("posts")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", postId);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("posts").delete().eq("id", postId);
    setDeleteDialogOpen(false);
    setDeleting(false);
    router.refresh();
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
          {status !== "archived" ? (
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleRestore}>
              <RotateCcw className="size-4" />
              Restore to Draft
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent
          className="sm:max-w-[400px]"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This will permanently delete this post and all its versions.
              This action cannot be undone.
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
    </>
  );
}
