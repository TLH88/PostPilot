"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Loader2, Monitor, Paperclip, Smartphone } from "lucide-react";
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Write the HTML into the sandboxed iframe whenever it changes.
  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html, viewport, open]);

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
                sandbox=""
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
