"use client";

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
import { openLinkedInShare } from "@/lib/linkedin";

interface LinkedInShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  hashtags: string[];
}

export function LinkedInShareDialog({
  open,
  onOpenChange,
  content,
  hashtags,
}: LinkedInShareDialogProps) {
  function handleShare() {
    openLinkedInShare(content, hashtags);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedInIcon className="size-5 text-[#0A66C2]" />
            Post to LinkedIn
          </DialogTitle>
          <DialogDescription>
            Your post is scheduled! Would you like to share it on LinkedIn now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button
            onClick={handleShare}
            className="gap-2 bg-[#0A66C2] text-white hover:bg-[#004182]"
          >
            <LinkedInIcon className="size-4" />
            Post to LinkedIn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
