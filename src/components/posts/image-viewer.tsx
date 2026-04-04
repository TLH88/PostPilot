"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  alt?: string;
}

export function ImageViewer({ open, onOpenChange, imageUrl, alt }: ImageViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!p-0 !gap-0 !rounded-lg overflow-hidden bg-black/95 border-none"
        style={{ maxWidth: "90vw", maxHeight: "90vh" }}
        showCloseButton={false}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="size-4" />
        </button>
        <img
          src={imageUrl}
          alt={alt || "Full resolution image"}
          className="w-full h-full object-contain"
          style={{ maxHeight: "88vh" }}
        />
      </DialogContent>
    </Dialog>
  );
}
