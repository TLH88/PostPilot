"use client";

/**
 * BP-131: Admin user-deletion dialog with two-stage confirmation.
 *
 * Stage 1: choose deletion type (soft/30-day grace, default; or hard/immediate).
 * Stage 2 (only if hard chosen): bold red warning + type-DELETE-to-confirm.
 *
 * Soft path skips Stage 2 — clicking "Delete user" submits directly.
 */
import { useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type DeletionType = "soft" | "hard";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email: string; full_name: string | null } | null;
  onDeleted?: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onDeleted,
}: DeleteUserDialogProps) {
  const [deletionType, setDeletionType] = useState<DeletionType>("soft");
  const [stage, setStage] = useState<"choose" | "confirm_hard">("choose");
  const [typedConfirm, setTypedConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose(value: boolean) {
    if (submitting) return;
    if (!value) {
      setStage("choose");
      setDeletionType("soft");
      setTypedConfirm("");
      setReason("");
    }
    onOpenChange(value);
  }

  async function performDelete() {
    if (!user) return;
    setSubmitting(true);

    const params = new URLSearchParams({ userId: user.id, type: deletionType });
    const res = await fetch(`/api/admin/users?${params}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const issues = (data.issues ?? []) as Array<{ message: string }>;
      const detail = issues.length > 0 ? `\n${issues.map((i) => `• ${i.message}`).join("\n")}` : "";
      toast.error(`${data.reason ?? data.error ?? "Delete failed"}${detail}`);
      return;
    }

    toast.success(
      deletionType === "hard"
        ? `${user.email} has been permanently deleted`
        : `${user.email} is scheduled for deletion in 30 days`
    );
    onDeleted?.();
    handleClose(false);
  }

  function handlePrimary() {
    if (deletionType === "hard" && stage === "choose") {
      setStage("confirm_hard");
      return;
    }
    performDelete();
  }

  if (!user) return null;

  const userLabel = user.full_name ? `${user.full_name} (${user.email})` : user.email;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[520px]"
        onClick={(e) => e.stopPropagation()}
      >
        {stage === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                Delete user
              </DialogTitle>
              <DialogDescription>
                You are about to delete <span className="font-medium text-foreground">{userLabel}</span>.
                Choose how this deletion should be handled.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <label
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  deletionType === "soft"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="deletion-type"
                  value="soft"
                  checked={deletionType === "soft"}
                  onChange={() => setDeletionType("soft")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Soft delete (recommended)</p>
                  <p className="text-xs text-muted-foreground">
                    Account is suspended immediately. The user can no longer sign in. After
                    a 30-day grace period, all data is permanently removed by an automated
                    job. Restorable during the grace window.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  deletionType === "hard"
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="deletion-type"
                  value="hard"
                  checked={deletionType === "hard"}
                  onChange={() => setDeletionType("hard")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Hard delete (immediate)</p>
                  <p className="text-xs text-muted-foreground">
                    All data is removed right now. Not recoverable, even by support. Requires
                    a second confirmation on the next step.
                  </p>
                </div>
              </label>

              <div>
                <Label htmlFor="delete-reason" className="text-xs text-muted-foreground">
                  Reason <span className="font-normal">(optional, recorded in audit log)</span>
                </Label>
                <Input
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1"
                  placeholder="ToS violation, user request, etc."
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handlePrimary}
                disabled={submitting}
                variant={deletionType === "hard" ? "destructive" : "default"}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : deletionType === "hard" ? (
                  "Continue to confirmation"
                ) : (
                  "Schedule deletion"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {stage === "confirm_hard" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="size-4" />
                This action is permanent
              </DialogTitle>
              <DialogDescription className="text-foreground">
                You are about to <span className="font-bold text-destructive">permanently delete</span>{" "}
                <span className="font-medium">{userLabel}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive-foreground">
                <p className="font-medium text-destructive">This cannot be undone.</p>
                <p className="mt-1 text-xs text-foreground">
                  All of this user&apos;s posts, ideas, library items, uploaded files,
                  scheduled posts, and analytics will be deleted immediately. There is no
                  recovery — not even by support.
                </p>
              </div>

              <div>
                <Label htmlFor="delete-confirm" className="text-sm font-medium">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  className="mt-1.5 font-mono"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setStage("choose")}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={performDelete}
                disabled={submitting || typedConfirm !== "DELETE"}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Permanently delete account"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
