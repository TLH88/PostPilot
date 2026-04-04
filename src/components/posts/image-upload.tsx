"use client";

import { useState, useRef } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageViewer } from "@/components/posts/image-viewer";
import { toast } from "sonner";

interface ImageUploadProps {
  postId: string;
  imageUrl: string | null;
  onImageChange: (imageUrl: string | null) => void;
  compact?: boolean;
  /** Render buttons only in a row — no image preview (parent handles preview) */
  inline?: boolean;
}

export function ImageUpload({
  postId,
  imageUrl,
  onImageChange,
  compact = false,
  inline = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPG, PNG, GIF, or WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("postId", postId);

      const res = await fetch("/api/posts/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to upload image");
        return;
      }

      onImageChange(data.imageUrl);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/posts/upload-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (!res.ok) {
        toast.error("Failed to remove image");
        return;
      }

      onImageChange(null);
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setRemoving(false);
    }
  }

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      className="hidden"
      onChange={handleFileSelect}
    />
  );

  // Inline mode — buttons only, no image preview
  if (inline) {
    return (
      <>
        {fileInput}
        {imageUrl ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
              {uploading ? "Uploading..." : "Replace Image"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              Remove
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            {uploading ? "Uploading..." : "Add Image"}
          </Button>
        )}
      </>
    );
  }

  // Has image — show preview with action buttons below
  if (imageUrl) {
    if (compact) {
      // Compact mode (publish dialog) — small preview with hover controls
      return (
        <div className="relative inline-block">
          {fileInput}
          {imageUrl && <ImageViewer open={viewerOpen} onOpenChange={setViewerOpen} imageUrl={imageUrl} />}
          <div className="relative group">
            <img
              src={imageUrl}
              alt="Post image"
              className="h-16 w-auto rounded border object-cover cursor-pointer"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerOpen(true); }}
            />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="xs"
                className="h-6 w-6 p-0 rounded-full shadow-md"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="size-3 animate-spin" /> : <ImagePlus className="size-3" />}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                className="h-6 w-6 p-0 rounded-full shadow-md"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Full mode (editor) — image with buttons below
    return (
      <div className="space-y-2">
        {fileInput}
        <img
          src={imageUrl}
          alt="Post image"
          className="w-full max-h-48 rounded-lg border object-cover"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            {uploading ? "Uploading..." : "Replace Image"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={removing}
          >
            {removing ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            {removing ? "Removing..." : "Remove"}
          </Button>
        </div>
      </div>
    );
  }

  // No image — show upload button
  return (
    <div>
      {fileInput}
      <Button
        variant="outline"
        size={compact ? "xs" : "sm"}
        className="gap-1.5"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ImagePlus className="size-3.5" />
        )}
        {uploading ? "Uploading..." : "Add Image"}
      </Button>
    </div>
  );
}
