"use client";

import { useState, useEffect } from "react";
import { Send, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WorkspaceMember {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  role: string;
}

interface SubmitForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  workspaceId: string;
  currentUserId: string;
  onSubmitted?: () => void;
}

const REVIEWABLE_ROLES = ["owner", "admin", "editor"];

export function SubmitForReviewDialog({
  open,
  onOpenChange,
  postId,
  workspaceId,
  currentUserId,
  onSubmitted,
}: SubmitForReviewDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !workspaceId) return;
    setLoading(true);
    fetch(`/api/workspace/members?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        // Only show members eligible to review (owner/admin/editor) and exclude self
        const eligible = ((data.members ?? []) as WorkspaceMember[])
          .filter((m) => REVIEWABLE_ROLES.includes(m.role) && m.user_id !== currentUserId);
        setMembers(eligible);
      })
      .catch(() => toast.error("Failed to load workspace members"))
      .finally(() => setLoading(false));
  }, [open, workspaceId, currentUserId]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one reviewer");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/posts/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          postId,
          reviewers: selectedIds,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        `Submitted for review. ${selectedIds.length} reviewer${selectedIds.length !== 1 ? "s" : ""} notified.`
      );
      onOpenChange(false);
      setSelectedIds([]);
      onSubmitted?.();
    } catch {
      toast.error("Failed to submit for review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            Submit for Review
          </DialogTitle>
          <DialogDescription>
            Select who should review this post. They will be notified immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No eligible reviewers found. Invite editors, admins, or an owner to your workspace first.
            </div>
          ) : (
            members.map((m) => {
              const selected = selectedIds.includes(m.user_id);
              const initials = m.full_name
                ? m.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : "?";
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleSelection(m.user_id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-hover-highlight"
                  )}
                >
                  <div className={cn(
                    "flex size-9 items-center justify-center rounded-full shrink-0 text-xs font-bold",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{m.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.role}
                      {m.headline && <span className="ml-1">&middot; {m.headline}</span>}
                    </p>
                  </div>
                  {selected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedIds.length === 0}
            className="gap-1.5"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Submit for Review
            {selectedIds.length > 0 && ` (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
