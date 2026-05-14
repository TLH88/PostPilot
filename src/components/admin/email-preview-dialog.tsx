"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Link as LinkIcon, Loader2, Monitor, Paperclip, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface EmailPreviewAttachment {
  filename: string;
  sizeBytes: number;
}

export interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-rendered HTML from POST /api/admin/email/preview. */
  html: string | null;
  /** Loading state while the render request is in flight. */
  loading: boolean;
  /** Optional error message from the preview request. */
  error?: string | null;
  /** Used for the header so admin remembers what they're previewing. */
  subject: string;
  /** Sender + reply-to readable label. */
  fromLabel: string;
  /** Recipient line ("3 users" or "user@example.com"). */
  recipientLabel: string;
  /** Attached files (filename + size). Rendered as a chip list. */
  attachments: EmailPreviewAttachment[];
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  html,
  loading,
  error,
  subject,
  fromLabel,
  recipientLabel,
  attachments,
}: EmailPreviewDialogProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // After the iframe renders, attach hover listeners to its anchors so
  // we can show the href in a status bar below the preview. Browsers'
  // native title-attribute tooltips work but vary by OS / settings, so
  // an in-UI fallback is more reliable.
  //
  // sandbox=\"allow-same-origin\" gives the parent DOM access to the
  // iframe (so we can attach listeners) without enabling scripts/forms.
  useEffect(() => {
    if (!open || !html) return;
    const frame = iframeRef.current;
    if (!frame) return;

    function bind() {
      const doc = frame?.contentDocument;
      if (!doc) return;
      const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>("a[href]"));
      const onEnter = (e: Event) => {
        const a = e.currentTarget as HTMLAnchorElement;
        setHoveredUrl(a.getAttribute("href"));
      };
      const onLeave = () => setHoveredUrl(null);
      for (const a of anchors) {
        a.addEventListener("mouseenter", onEnter);
        a.addEventListener("mouseleave", onLeave);
      }
      return () => {
        for (const a of anchors) {
          a.removeEventListener("mouseenter", onEnter);
          a.removeEventListener("mouseleave", onLeave);
        }
      };
    }

    // srcDoc renders synchronously on attribute change, but the iframe
    // load event fires on the next tick. Bind on load and also try once
    // immediately in case the content is already ready.
    let cleanup = bind();
    const onLoad = () => {
      cleanup?.();
      cleanup = bind();
    };
    frame.addEventListener("load", onLoad);
    return () => {
      frame.removeEventListener("load", onLoad);
      cleanup?.();
    };
  }, [open, html, viewport]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="size-4" />
            Email preview
          </DialogTitle>
          <DialogDescription>
            Exactly what your recipient sees — same template, same sanitization.
          </DialogDescription>
        </DialogHeader>

        {/* Meta header (looks like an inbox row) */}
        <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <div className="flex gap-2">
            <span className="w-16 text-muted-foreground shrink-0">From</span>
            <span className="font-medium truncate">{fromLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 text-muted-foreground shrink-0">To</span>
            <span className="truncate">{recipientLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 text-muted-foreground shrink-0">Subject</span>
            <span className="font-medium truncate">{subject || <span className="italic text-muted-foreground">No subject</span>}</span>
          </div>
          {attachments.length > 0 && (
            <div className="flex gap-2 items-start pt-1">
              <span className="w-16 text-muted-foreground shrink-0 pt-0.5">Attached</span>
              <div className="flex flex-wrap gap-1">
                {attachments.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 font-normal text-[10px]">
                    <Paperclip className="size-2.5" />
                    {a.filename}
                    <span className="text-muted-foreground">({humanSize(a.sizeBytes)})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Viewport toggle */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Preview viewport</span>
          <div className="inline-flex items-center gap-0.5 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
                viewport === "desktop"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={viewport === "desktop"}
            >
              <Monitor className="size-3" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
                viewport === "mobile"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={viewport === "mobile"}
            >
              <Smartphone className="size-3" />
              Mobile
            </button>
          </div>
        </div>

        {/* Status bar showing hovered link href */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-mono transition-colors",
            hoveredUrl
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-border bg-muted/30 text-muted-foreground italic",
          )}
        >
          <LinkIcon className="size-3 shrink-0" />
          <span className="truncate">
            {hoveredUrl ?? "Hover any link in the preview to see its URL"}
          </span>
        </div>

        {/* Iframe sandbox */}
        <div className="rounded-md border bg-slate-50 dark:bg-slate-900 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Rendering preview…
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : html ? (
            <div className={cn("mx-auto bg-white transition-all", viewport === "mobile" ? "max-w-[375px]" : "w-full")}>
              <iframe
                ref={iframeRef}
                title="Email preview"
                srcDoc={html}
                sandbox="allow-same-origin"
                className="block w-full"
                style={{ height: "60vh", border: 0 }}
              />
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing to preview yet.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
