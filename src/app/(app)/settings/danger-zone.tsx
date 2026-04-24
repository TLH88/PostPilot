"use client";

/**
 * BP-131 Session 2: User self-serve account deletion.
 *
 * Self-delete is always SOFT (30-day grace). The grace window is the
 * primary safety net; users who change their mind in those 30 days
 * contact support to restore (admin-driven via the existing restore
 * endpoint).
 *
 * Email-based re-auth confirmation is deferred to a follow-up BP that
 * lands once email infrastructure (Resend/Sendgrid) is in place. For
 * now: type "DELETE" to confirm, plus the 30-day grace, gives us
 * adequate protection for accidental clicks.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function handleClose(value: boolean) {
    if (submitting) return;
    if (!value) {
      setTypedConfirm("");
      setReason("");
      setAcknowledged(false);
    }
    setOpen(value);
  }

  async function performDelete() {
    setSubmitting(true);

    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const issues = (data.issues ?? []) as Array<{ message: string }>;
      const detail =
        issues.length > 0 ? `\n${issues.map((i) => `• ${i.message}`).join("\n")}` : "";
      toast.error(`${data.reason ?? data.error ?? "Failed to delete account"}${detail}`);
      setSubmitting(false);
      return;
    }

    // Sign the user out before redirecting — the auth.users row was banned
    // by the soft delete, but the local session cookie still exists until
    // we explicitly clear it.
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // best-effort; the redirect below loses the session anyway
    }

    router.push("/goodbye");
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Permanently delete your PostPilot account and all data associated with it —
        posts, ideas, content library, uploaded files, scheduled posts, analytics.
        Your account is suspended immediately and permanently deleted after a
        30-day grace period. To restore during the grace window, contact support.
      </p>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Trash2 className="size-4" />
        Delete my account
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              Delete your account
            </DialogTitle>
            <DialogDescription className="text-foreground">
              You are about to delete your PostPilot account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <p className="font-bold text-destructive text-base">
                You have 30 days to recover your account
              </p>
              <p className="mt-2 text-sm text-foreground">
                After clicking delete, your account is{" "}
                <span className="font-medium">suspended immediately</span>. You can
                contact support during the next{" "}
                <span className="font-bold">30 days</span> to restore it.
              </p>
              <p className="mt-2 text-sm text-foreground">
                <span className="font-bold text-destructive">
                  After 30 days, all of your data is permanently deleted and cannot be recovered.
                </span>{" "}
                This includes your posts, ideas, library items, uploaded files,
                scheduled posts, and analytics.
              </p>
            </div>

            <div>
              <Label htmlFor="self-delete-reason" className="text-xs text-muted-foreground">
                Reason <span className="font-normal">(optional, helps us improve)</span>
              </Label>
              <Input
                id="self-delete-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                placeholder="What made you want to leave?"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                I understand my account is recoverable for{" "}
                <span className="font-medium">30 days</span>, after which all of
                my data is{" "}
                <span className="font-bold text-destructive">permanently deleted</span>{" "}
                and cannot be reversed.
              </span>
            </label>

            <div>
              <Label htmlFor="self-delete-confirm" className="text-sm font-medium">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="self-delete-confirm"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                className="mt-1.5 font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={performDelete}
              disabled={submitting || typedConfirm !== "DELETE" || !acknowledged}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete my account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
