"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, FileEdit, CalendarClock } from "lucide-react";
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
import { LinkedInPreview } from "@/components/posts/linkedin-preview";
import { ImageUpload } from "@/components/posts/image-upload";
import { ImageVersionPicker } from "@/components/posts/image-version-picker";
import { toast } from "sonner";

interface PublishPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  title: string | null;
  content: string;
  hashtags: string[];
  imageUrl?: string | null;
  authorName: string;
  authorHeadline: string;
  /** Show "Open in Editor" button (hide when already in editor) */
  showEditorLink?: boolean;
  /** Called after successful publish */
  onPublished?: (result: { postUrl: string; postId: string }) => void;
  /** Called if token is expired */
  onTokenExpired?: () => void;
  /** Called when image changes */
  onImageChange?: (imageUrl: string | null) => void;
  /** Called when user clicks Schedule */
  onSchedule?: () => void;
}

export function PublishPreviewDialog({
  open,
  onOpenChange,
  postId,
  title,
  content,
  hashtags,
  imageUrl: initialImageUrl,
  authorName,
  authorHeadline,
  showEditorLink = false,
  onPublished,
  onTokenExpired,
  onImageChange,
  onSchedule,
}: PublishPreviewDialogProps) {
  const [publishing, setPublishing] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    initialImageUrl ?? null
  );
  const router = useRouter();

  // Sync when dialog opens with new props
  const [lastInitial, setLastInitial] = useState(initialImageUrl);
  if (initialImageUrl !== lastInitial) {
    setCurrentImageUrl(initialImageUrl ?? null);
    setLastInitial(initialImageUrl);
  }

  // Build the content string with hashtags as it will appear on LinkedIn
  const hashtagText =
    hashtags.length > 0
      ? "\n\n" + hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
  const previewContent = content + hashtagText;

  function handleImageChange(url: string | null) {
    setCurrentImageUrl(url);
    onImageChange?.(url);
  }

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
            imageUrl={currentImageUrl}
            authorName={authorName}
            authorHeadline={authorHeadline}
            truncate
          />
        </div>

        {/* Image selector + version history */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <ImageUpload
              postId={postId}
              imageUrl={currentImageUrl}
              onImageChange={handleImageChange}
              compact
            />
          </div>
          <ImageVersionPicker
            postId={postId}
            currentImageUrl={currentImageUrl}
            onImageChange={handleImageChange}
          />
        </div>

        {/* Actions */}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={publishing}
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            {onSchedule && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onSchedule();
                }}
                disabled={publishing}
              >
                <CalendarClock className="size-3.5" />
                Schedule
              </Button>
            )}

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
