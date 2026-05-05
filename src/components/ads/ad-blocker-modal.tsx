"use client";

/**
 * BP-045 — Hard-gate modal shown to Free + Personal tier users when an
 * ad-blocker is detected.
 *
 * Behavior:
 *   - Cannot be dismissed by the user (no close button, scrim is
 *     non-interactive). Per owner direction 2026-05-04: "We only allow
 *     continued use for free and personal users if they disable their
 *     ad blocker."
 *   - Provides a clear remediation path: explanation, link to the
 *     ad clause in the Terms of Service, and a "Retry" button that
 *     re-runs detection. If the user has actually disabled their
 *     blocker, retry succeeds and the modal closes.
 *   - Provides an upgrade off-ramp: link to /pricing in case the user
 *     would rather pay for an ad-free tier than disable shielding.
 */

import Link from "next/link";
import { ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdBlockerModalProps {
  open: boolean;
  retrying: boolean;
  onRetry: () => void;
}

export function AdBlockerModal({ open, retrying, onRetry }: AdBlockerModalProps) {
  return (
    <Dialog open={open}>
      {/*
        Hard-gate semantics: `open` is controlled and we deliberately do
        not pass `onOpenChange`, so any user dismiss attempt (escape,
        scrim click) is a no-op — the dialog stays open. `showCloseButton`
        hides the "x" affordance.
      */}
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
            <ShieldAlert
              aria-hidden="true"
              className="size-5 text-amber-600 dark:text-amber-400"
            />
          </div>
          <DialogTitle>We&apos;ve detected an ad-blocker</DialogTitle>
          <DialogDescription className="space-y-3">
            <span className="block">
              PostPilot&apos;s Free and Personal plans are partially supported
              by ads — that&apos;s how we keep them affordable. Our{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Terms of Service
              </Link>{" "}
              for these tiers include your agreement to see and interact with
              the ads we display.
            </span>
            <span className="block">
              Please pause or disable your ad-blocker for this site, then
              click <strong>Retry</strong> below to continue. If you&apos;d
              rather not see ads, you can upgrade to an ad-free plan instead.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2">
          <Link
            href="/pricing"
            className={buttonVariants({ variant: "outline" })}
          >
            Upgrade to ad-free
          </Link>
          <Button onClick={onRetry} disabled={retrying}>
            {retrying ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Checking…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" aria-hidden="true" />
                I&apos;ve disabled it — Retry
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
