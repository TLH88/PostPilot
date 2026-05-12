"use client";

/**
 * Onboarding LinkedIn connect step — owner direction 2026-05-12.
 *
 * Final step of the onboarding wizard. Replaces the post-onboarding
 * auto-prompt dialog that used to fire on launch-pad and collide with
 * the tutorial system. Folded into the wizard so the user makes an
 * explicit choice (connect vs skip) before they ever reach the tutorial.
 *
 * Behavior:
 *   - Primary CTA: "Connect LinkedIn" → /api/linkedin/connect?return_to=
 *     /launch-pad. LinkedIn OAuth callback redirects back to /launch-pad
 *     with linkedin=connected and the tutorial fires on arrival.
 *   - Skip link: caller's onSkip handler completes onboarding without
 *     connecting. User can connect later from the persistent banner or
 *     Settings.
 *   - Connect-clicked state shows a "Sending you to LinkedIn…" loading
 *     state so the user understands the redirect is in flight.
 *
 * Component is presentational — actual flag-setting and onboarding
 * completion live in the parent (onboarding page) so the same handler
 * can fire whether the user clicked Connect or Skip.
 */

import { useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkedInIcon } from "@/components/icons/linkedin";

interface LinkedInConnectStepProps {
  /**
   * Called when the user clicks the "Connect LinkedIn" button. Parent
   * should mark onboarding complete + set the suppression flag, then
   * navigate to /api/linkedin/connect?return_to=/launch-pad. We return
   * a promise so the button can show a loading state while parent work
   * completes.
   */
  onConnect: () => Promise<void> | void;
  /**
   * Called when the user clicks "Skip for now". Parent marks onboarding
   * complete + sets the suppression flag, then navigates to /launch-pad.
   */
  onSkip: () => Promise<void> | void;
}

export function LinkedInConnectStep({
  onConnect,
  onSkip,
}: LinkedInConnectStepProps) {
  const [busy, setBusy] = useState<"connect" | "skip" | null>(null);

  async function handleConnect() {
    if (busy) return;
    setBusy("connect");
    try {
      await onConnect();
    } finally {
      // Leave busy state set — parent triggers a full-page navigation;
      // if that fails, the UI will re-render through the parent.
    }
  }

  async function handleSkip() {
    if (busy) return;
    setBusy("skip");
    try {
      await onSkip();
    } finally {
      // Same as above — parent navigates.
    }
  }

  return (
    <div className="space-y-6">
      {/* Headline + brand-blue LinkedIn lockup */}
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0A66C2]/10 text-[#0A66C2]">
          <LinkedInIcon className="size-5" />
        </span>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">
            Connect LinkedIn for posting
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Connect your LinkedIn account so PostPilot can publish posts
            on your behalf. This is the expected last step — and it lets
            you actually use the features you just set up. This is a
            separate authorization from your account login, and your
            PostPilot session stays active throughout.
          </p>
        </div>
      </div>

      {/* What connecting does — three short bullets */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
        <div className="flex items-start gap-2.5 text-sm">
          <Send className="size-4 mt-0.5 shrink-0 text-[#0A66C2]" />
          <p>
            <span className="font-medium">Publish posts you draft here</span>{" "}
            — directly to your LinkedIn feed, on your schedule.
          </p>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <ShieldCheck className="size-4 mt-0.5 shrink-0 text-[#0A66C2]" />
          <p>
            <span className="font-medium">Posting authorization only</span>{" "}
            — PostPilot never reads your inbox or feed, and we don&apos;t
            store your LinkedIn password. You can revoke access from
            LinkedIn at any time.
          </p>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-[#0A66C2]" />
          <p>
            <span className="font-medium">Your session stays active</span>{" "}
            — you&apos;ll be sent to LinkedIn to authorize, then bounced
            right back to your launch pad.
          </p>
        </div>
      </div>

      {/* Primary action */}
      <Button
        type="button"
        size="lg"
        onClick={handleConnect}
        disabled={busy !== null}
        className="w-full gap-2 bg-[#0A66C2] text-white hover:bg-[#004182]"
      >
        {busy === "connect" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending you to LinkedIn…
          </>
        ) : (
          <>
            <LinkedInIcon className="size-4" />
            Connect LinkedIn
          </>
        )}
      </Button>

      {/* Skip — small text link, owner direction 2026-05-12: skipping is
          allowed but should clearly be the non-default path. The user can
          always come back via the persistent status banner or Settings. */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleSkip}
          disabled={busy !== null}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "skip" ? "Skipping…" : "Skip for now — I'll connect later"}
        </button>
      </div>
    </div>
  );
}
