"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, ExternalLink, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { LinkedInPreview } from "@/components/posts/linkedin-preview";
import { toast } from "sonner";

interface PublishPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  title: string | null;
  content: string;
  hashtags: string[];
  authorName: string;
  authorHeadline: string;
  /** Show "Open in Editor" button (hide when already in editor) */
  showEditorLink?: boolean;
  /** Called after successful publish */
  onPublished?: (result: { postUrl: string; postId: string }) => void;
  /** Called if token is expired */
  onTokenExpired?: () => void;
}

export function PublishPreviewDialog({
  open,
  onOpenChange,
  postId,
  title,
  content,
  hashtags,
  authorName,
  authorHeadline,
  showEditorLink = false,
  onPublished,
  onTokenExpired,
}: PublishPreviewDialogProps) {
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();

  // Build the content string with hashtags as it will appear on LinkedIn
  const hashtagText =
    hashtags.length > 0
      ? "\n\n" + hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  const previewContent = content + hashtagText;

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/linkedin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.expired) {
          onTokenExpired?.();
        }
        toast.error(data.error || "Failed to publish to LinkedIn", {
          description: data.action,
          duration: 8000,
        });
        return;
      }

      toast.success(
        <span>
          Posted to LinkedIn!{" "}
          <a
            href={data.linkedinPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            View post
          </a>
        </span>
      );

      onOpenChange(false);
      onPublished?.({
        postUrl: data.linkedinPostUrl,
        postId: data.linkedinPostId,
      });
    } catch {
      toast.error("Failed to publish to LinkedIn", {
        description: "Check your connection and try again.",
        duration: 8000,
      });
    } finally {
      setPublishing(false);
    }
  }

  function handleOpenInEditor() {
    onOpenChange(false);
    router.push(`/posts/${postId}`);
  }

  function handleClose(value: boolean) {
    if (!publishing) {
      onOpenChange(value);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedInIcon className="size-4 text-[#0A66C2]" />
            Preview — Publish to LinkedIn
          </DialogTitle>
          <DialogDescription>
            Review your post before publishing. This is how it will appear on LinkedIn.
          </DialogDescription>
        </DialogHeader>

        {/* Preview — scrollable container with fixed height */}
        <div
          className="overflow-y-auto flex-1 py-2 min-h-0"
          style={{ maxHeight: "calc(80vh - 200px)" }}
        >
          <LinkedInPreview
            content={previewContent}
            title={title}
            authorName={authorName}
            authorHeadline={authorHeadline}
            truncate
          />
        </div>

        {/* Actions */}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={publishing}
            >
              Cancel
            </Button>

            {showEditorLink && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleOpenInEditor}
                disabled={publishing}
              >
                <FileEdit className="size-3.5" />
                Open in Editor
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    disabled
                  />
                }
              >
                <ImagePlus className="size-3.5" />
                Add Image
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>

            <Button
              className="gap-1.5 bg-[#0A66C2] text-white hover:bg-[#004182]"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ExternalLink className="size-3.5" />
              )}
              {publishing ? "Publishing..." : "Approve & Publish"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
