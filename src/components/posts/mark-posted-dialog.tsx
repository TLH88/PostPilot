"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
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

interface MarkPostedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle?: string | null;
  onSuccess?: () => void;
}

export function MarkPostedDialog({
  open,
  onOpenChange,
  postId,
  postTitle,
  onSuccess,
}: MarkPostedDialogProps) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleConfirm() {
    setSaving(true);

    const updates: Record<string, unknown> = {
      status: "posted",
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (linkedinUrl.trim()) {
      updates.linkedin_post_url = linkedinUrl.trim();
    }

    const { error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId);

    setSaving(false);

    if (!error) {
      setLinkedinUrl("");
      onOpenChange(false);
      onSuccess?.();
    }
  }

  function handleClose(value: boolean) {
    if (!saving) {
      setLinkedinUrl("");
      onOpenChange(value);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[440px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="size-4 text-green-600" />
            Mark as Posted to LinkedIn
          </DialogTitle>
          <DialogDescription>
            {postTitle
              ? `Mark "${postTitle}" as posted.`
              : "Mark this post as posted to LinkedIn."}{" "}
            If you have the LinkedIn post URL, you can add it below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label htmlFor="linkedin-url" className="text-sm font-medium mb-1.5">
            LinkedIn post URL{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="linkedin-url"
            placeholder="https://www.linkedin.com/posts/..."
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Mark as Posted"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
