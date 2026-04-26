"use client";

/**
 * BP-136 / UF-002b: Pre-redirect interstitial for LinkedIn posting authorization.
 *
 * PostPilot has two separate OAuth flows: Supabase OIDC for app login, and a
 * custom LinkedIn OAuth for posting permissions (Supabase doesn't persist
 * LinkedIn tokens, so we run our own). When the user needs to authorize the
 * posting scope, an immediate redirect to LinkedIn felt to one test user like
 * being logged out. This dialog explains what's about to happen so the user
 * understands the redirect is intentional and their PostPilot session stays
 * active.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LinkedInIcon } from "@/components/icons/linkedin";

export type LinkedInConnectReason =
  | "first-time"
  | "revoked"
  | "expired"
  | "reconnect";

interface LinkedInConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: LinkedInConnectReason;
}

const HEADLINES: Record<LinkedInConnectReason, string> = {
  "first-time": "Connect LinkedIn for posting",
  revoked: "Reconnect LinkedIn",
  expired: "Reconnect LinkedIn",
  reconnect: "Reconnect LinkedIn",
};

const BODIES: Record<LinkedInConnectReason, string> = {
  "first-time":
    "We're going to send you to LinkedIn so you can authorize PostPilot to publish posts on your behalf. This is a separate authorization from your account login — your PostPilot session stays active and you'll be returned here when complete.",
  revoked:
    "LinkedIn has revoked PostPilot's posting permission, so scheduled posts will fail until you reconnect. We'll send you to LinkedIn to re-authorize — your PostPilot session stays active and you'll be returned here when complete.",
  expired:
    "Your LinkedIn posting authorization has expired. We'll send you to LinkedIn to renew it — your PostPilot session stays active and you'll be returned here when complete.",
  reconnect:
    "We'll send you to LinkedIn to re-authorize PostPilot for posting. Your PostPilot session stays active and you'll be returned here when complete.",
};

export function LinkedInConnectDialog({
  open,
  onOpenChange,
  reason = "first-time",
}: LinkedInConnectDialogProps) {
  const [continuing, setContinuing] = useState(false);

  function handleContinue() {
    setContinuing(true);
    window.location.href = "/api/linkedin/connect";
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !continuing && onOpenChange(value)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedInIcon className="size-4 text-[#0A66C2]" />
            {HEADLINES[reason]}
          </DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">
            {BODIES[reason]}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={continuing}
          >
            Not now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={continuing}
            className="gap-1.5 bg-[#0A66C2] text-white hover:bg-[#004182]"
          >
            {continuing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Sending you to LinkedIn…
              </>
            ) : (
              <>
                <LinkedInIcon className="size-3.5" />
                Continue to LinkedIn
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
