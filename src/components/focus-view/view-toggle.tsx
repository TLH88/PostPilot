"use client";

/**
 * BP-099: Top-bar button that switches the user between Focus View
 * and Standard Dashboard. The current mode is passed in as a prop
 * (server-fetched in the layout) so the button label always matches
 * what's actually persisted.
 *
 * Clicking opens a confirm dialog with explicit consequence text,
 * per the design doc §3 — no silent switching, no Esc-to-bail. After
 * the user confirms, the API persists the new mode and we trigger a
 * router refresh so the server-rendered shell + page swap to the
 * new view immediately.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type UiMode = "focus" | "standard";

interface ViewToggleProps {
  currentMode: UiMode;
}

export function ViewToggle({ currentMode }: ViewToggleProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  // The button shows the mode the user will SWITCH TO, not the current one.
  // (Matches the "Full View" label spec in the design doc — when you're in
  // Focus View, the button is labeled to take you to Full View.)
  const targetMode: UiMode = currentMode === "focus" ? "standard" : "focus";

  const buttonLabel = targetMode === "standard" ? "Full View" : "Focus View";
  const buttonIcon =
    targetMode === "standard" ? (
      <LayoutDashboard className="size-4" />
    ) : (
      <LayoutGrid className="size-4" />
    );

  const dialogTitle =
    targetMode === "standard"
      ? "Switch to Full View?"
      : "Switch to Focus View?";

  const dialogBody =
    targetMode === "standard"
      ? "Full View shows all menus, tools, and advanced features. You can switch back to Focus View anytime from the top-right of any page."
      : "Focus View is a simplified home with the four most common actions. You can switch back to Full View anytime from the top-right of any page.";

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/ui-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: targetMode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not switch view. Please try again.");
        setSubmitting(false);
        return;
      }

      // Close the dialog first so the user sees the swap happen.
      setDialogOpen(false);
      setSubmitting(false);

      // Refresh server components so the new mode takes effect on the
      // current page (the dashboard route conditionally renders
      // FocusViewHome vs the standard dashboard based on ui_mode).
      startTransition(() => {
        router.refresh();
      });

      toast.success(
        targetMode === "focus"
          ? "Switched to Focus View."
          : "Switched to Full View."
      );
    } catch {
      toast.error("Could not switch view. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="default"
        onClick={() => setDialogOpen(true)}
        title={`Switch to ${buttonLabel}`}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
        disabled={pending}
      >
        {buttonIcon}
        <span className="hidden sm:inline">{buttonLabel}</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Switching…
                </>
              ) : (
                `Switch to ${buttonLabel}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
