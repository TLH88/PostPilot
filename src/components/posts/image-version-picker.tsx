"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageVersion {
  id: string;
  image_url: string;
  storage_path: string;
  source: "ai" | "upload";
  created_at: string;
}

interface ImageVersionPickerProps {
  postId: string;
  currentImageUrl: string | null;
  onImageChange: (imageUrl: string | null) => void;
  /**
   * External re-fetch trigger — increment to force the picker to
   * re-load versions from the API even when `currentImageUrl` hasn't
   * changed. Owner direction 2026-05-07: when the user closes the
   * Generate Image dialog without clicking "Save and use", any newly
   * generated versions should still appear in the strip without a
   * page reload.
   */
  refreshKey?: number;
  /**
   * Layout orientation — "horizontal" (default) renders a left-to-right
   * scroll strip below the active image; "vertical" renders a top-to-
   * bottom scroll strip alongside the image. Owner direction 2026-05-07:
   * editor's Post Image card uses "vertical" so the active image gets
   * the full horizontal real estate instead of being centered with
   * empty space on either side.
   */
  orientation?: "horizontal" | "vertical";
}

/**
 * Horizontal thumbnail strip showing all image versions for a post.
 * Allows selecting any previous version as the active post image.
 */
export function ImageVersionPicker({
  postId,
  currentImageUrl,
  onImageChange,
  refreshKey = 0,
  orientation = "horizontal",
}: ImageVersionPickerProps) {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVersions();
  }, [postId, currentImageUrl, refreshKey]);

  async function loadVersions() {
    try {
      const res = await fetch(`/api/posts/image-versions?postId=${postId}`);
      if (!res.ok) return;
      const data = await res.json();
      setVersions(data.versions ?? []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function selectVersion(version: ImageVersion) {
    if (version.image_url === currentImageUrl) return;
    setSelecting(true);
    try {
      const res = await fetch("/api/posts/select-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, versionId: version.id }),
      });
      if (!res.ok) {
        toast.error("Failed to select image");
        return;
      }
      onImageChange(version.image_url);
      toast.success("Image updated");
    } catch {
      toast.error("Failed to select image");
    } finally {
      setSelecting(false);
    }
  }

  function scrollPrev() {
    if (orientation === "vertical") {
      scrollRef.current?.scrollBy({ top: -160, behavior: "smooth" });
    } else {
      scrollRef.current?.scrollBy({ left: -160, behavior: "smooth" });
    }
  }

  function scrollNext() {
    if (orientation === "vertical") {
      scrollRef.current?.scrollBy({ top: 160, behavior: "smooth" });
    } else {
      scrollRef.current?.scrollBy({ left: 160, behavior: "smooth" });
    }
  }

  if (loading || versions.length <= 1) return null;

  const isVertical = orientation === "vertical";

  return (
    <div
      className={
        isVertical ? "flex flex-col gap-1.5 shrink-0" : "space-y-1.5"
      }
    >
      <p className="text-[11px] font-medium text-muted-foreground">
        Gallery ({versions.length})
      </p>
      <div className="relative group">
        {/* Scroll buttons (only when more thumbs than fit). Vertical
            mode is now a 2-col grid: ~3 rows visible at max-h-[320px]
            = 6 thumbs visible before scrolling kicks in. */}
        {versions.length > (isVertical ? 6 : 3) && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              className={
                isVertical
                  ? "absolute left-1/2 -translate-x-1/2 top-0 z-10 flex size-6 items-center justify-center rounded-full bg-background/90 border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  : "absolute left-0 top-1/2 -translate-y-1/2 z-10 flex size-6 items-center justify-center rounded-full bg-background/90 border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              }
            >
              {isVertical ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronLeft className="size-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className={
                isVertical
                  ? "absolute left-1/2 -translate-x-1/2 bottom-0 z-10 flex size-6 items-center justify-center rounded-full bg-background/90 border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  : "absolute right-0 top-1/2 -translate-y-1/2 z-10 flex size-6 items-center justify-center rounded-full bg-background/90 border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              }
            >
              {isVertical ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          </>
        )}

        {/* Thumbnail strip */}
        <div
          ref={scrollRef}
          className={
            isVertical
              ? "grid grid-cols-2 gap-2 overflow-y-auto py-0.5 px-0.5 max-h-[320px]"
              : "flex gap-2 overflow-x-auto py-0.5 px-0.5"
          }
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {versions.map((v) => {
            const isActive = v.image_url === currentImageUrl;
            return (
              <button
                key={v.id}
                type="button"
                disabled={selecting}
                onClick={() => selectVersion(v)}
                className={`relative shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                  isActive
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-transparent hover:border-foreground/20"
                }`}
                style={{ width: "128px", height: "96px" }}
                title={isActive ? "Currently selected" : `Switch to this ${v.source === "ai" ? "AI generated" : "uploaded"} image`}
              >
                <img
                  src={v.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {/* Source badge */}
                <span className="absolute bottom-0.5 right-0.5 rounded-full bg-background/80 p-0.5">
                  {v.source === "ai" ? (
                    <Sparkles className="size-2.5 text-primary" />
                  ) : (
                    <Upload className="size-2.5 text-muted-foreground" />
                  )}
                </span>
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-0.5 left-0.5 rounded-full bg-green-500 p-0.5">
                    <Check className="size-2 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
