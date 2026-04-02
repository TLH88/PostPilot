"use client";

import { CalendarIcon, Check, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LinkedInIcon } from "@/components/icons/linkedin";

interface LinkedInShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledFor?: Date | null;
  linkedinConnected?: boolean;
}

export function LinkedInShareDialog({
  open,
  onOpenChange,
  scheduledFor,
  linkedinConnected,
}: LinkedInShareDialogProps) {
  const formattedDate = scheduledFor
    ? scheduledFor.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const formattedTime = scheduledFor
    ? scheduledFor.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" />
            Post Scheduled
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              Your post has been scheduled for{" "}
              <span className="font-medium text-foreground">
                {formattedDate}
              </span>{" "}
              at{" "}
              <span className="font-medium text-foreground">
                {formattedTime}
              </span>
              .
            </span>
            {linkedinConnected ? (
              <span className="flex items-center gap-1.5 text-sm">
                <LinkedInIcon className="size-3.5 text-[#0A66C2]" />
                It will be automatically posted to LinkedIn at the scheduled
                time.
              </span>
            ) : (
              <span className="block text-sm">
                Connect your LinkedIn account in Settings to enable automatic
                posting.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button onClick={() => onOpenChange(false)} className="gap-1.5">
            <Check className="size-3.5" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
