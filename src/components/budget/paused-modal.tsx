"use client";

/**
 * BP-085 Phase 3 — One-time modal notification when a user's AI access is
 * paused due to exceeding their monthly USD budget.
 *
 * Fires once per pause incident, keyed by the `paused_at` timestamp. If
 * the user is unpaused and later re-paused, a new `paused_at` value will
 * trigger the modal again. The persistent `PausedBanner` handles the
 * always-visible notification; this modal is the front-loaded "you just
 * got paused" surface that demands an explicit dismiss.
 *
 * For now the only CTA is "Upgrade" (-> /pricing). A future BP will add
 * "Purchase additional AI credits" once the credit-pack system ships
 * (BP-124).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PausedModalProps {
  userId: string;
  paused: boolean;
  pausedAt: string | null;
}

export function PausedModal({ userId, paused, pausedAt }: PausedModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!paused || !pausedAt) return;
    if (typeof window === "undefined") return;
    const key = `pp:budget-paused-modal:${userId}:${pausedAt}`;
    if (window.localStorage.getItem(key)) return;
    // Persist the seen flag BEFORE opening so a subsequent render error
    // can't loop the modal back on next mount.
    window.localStorage.setItem(key, "1");
    // One-shot effect: gated by localStorage so it fires at most once per
    // pause incident. Matches the project pattern in notifications-bell.tsx
    // and mobile-launch-pad.tsx (BP-099 P2) for greeting/state-bootstrap effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [paused, pausedAt, userId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
            <AlertTriangle
              aria-hidden="true"
              className="size-5 text-amber-600 dark:text-amber-400"
            />
          </div>
          <DialogTitle>AI features have been paused</DialogTitle>
          <DialogDescription>
            You&apos;ve reached your monthly AI usage limit. Upgrade your plan
            to continue using AI features like brainstorming, drafting, and
            enhancement.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          <Link href="/pricing" className={buttonVariants()}>
            Upgrade plan
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
