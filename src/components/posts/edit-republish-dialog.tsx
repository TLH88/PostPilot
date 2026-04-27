"use client";

/**
 * BP-138 / UF-004: "Edit & republish" confirmation dialog for posts that are
 * already live on LinkedIn.
 *
 * Per the approved Option A spec (docs/plans/bp-138-ux-recommendation.md):
 * the user must acknowledge that PostPilot will not automatically delete the
 * existing LinkedIn post — they have to delete it themselves first to avoid
 * having two versions live. The "Open LinkedIn post" link gives them a
 * one-click path to do that.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditRepublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  linkedinPostUrl: string | null;
}

export function EditRepublishDialog({
  open,
  onOpenChange,
  postId,
  linkedinPostUrl,
}: EditRepublishDialogProps) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [continuing, setContinuing] = useState(false);

  function handleClose(value: boolean) {
    if (continuing) return;
    if (!value) setAcknowledged(false);
    onOpenChange(value);
  }

  function handleContinue() {
    setContinuing(true);
    router.push(`/posts/${postId}?edit=true&republish=1`);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="size-4 text-primary" />
            Edit and republish to LinkedIn?
          </DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">
            Your current LinkedIn post won&apos;t change automatically. To
            avoid having two versions live at once, delete it on LinkedIn
            first, then come back here to publish your edits.
          </DialogDescription>
        </DialogHeader>

        {linkedinPostUrl && (
          <a
            href={linkedinPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Open LinkedIn post
          </a>
        )}

        <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5"
          />
          <span>I&apos;ve deleted the original post on LinkedIn.</span>
        </label>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={continuing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!acknowledged || continuing}
            className="gap-1.5"
          >
            {continuing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Opening editor…
              </>
            ) : (
              "Continue editing"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
