"use client";

/**
 * BP-130: Reusable waitlist dialog. Used from the Team + Enterprise cards
 * on /pricing while those tiers are deferred (Coming Soon).
 */
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
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

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: "team" | "enterprise";
}

const TIER_LABEL: Record<WaitlistDialogProps["tier"], string> = {
  team: "Team",
  enterprise: "Enterprise",
};

export function WaitlistDialog({ open, onOpenChange, tier }: WaitlistDialogProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose(value: boolean) {
    if (submitting) return;
    if (!value) {
      setEmail("");
      setMessage("");
    }
    onOpenChange(value);
  }

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        tier,
        message: message.trim() || undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to submit. Please try again.");
      return;
    }

    toast.success(`Thanks! We'll reach out when ${TIER_LABEL[tier]} is available.`);
    handleClose(false);
  }

  const label = TIER_LABEL[tier];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            {label} plan — Join the waitlist
          </DialogTitle>
          <DialogDescription>
            {tier === "team"
              ? "Team plans are launching soon. Drop your email and we'll let you know the moment they're available."
              : "Enterprise plans include custom pricing, SSO, dedicated support, and SLA guarantees. Tell us about your team and we'll reach out."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="waitlist-email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="waitlist-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="waitlist-message" className="text-xs text-muted-foreground">
              {tier === "enterprise"
                ? "Tell us about your team (optional)"
                : "Anything we should know? (optional)"}
            </Label>
            <textarea
              id="waitlist-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
              maxLength={1000}
              placeholder={
                tier === "enterprise"
                  ? "How many users? Any specific needs (SSO, on-prem, integrations)?"
                  : "Anything we should know about your use case?"
              }
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !email.includes("@")}
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Submitting…
              </>
            ) : (
              "Join waitlist"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
