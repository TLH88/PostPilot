"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Per-email payload cap (matches EMAIL_PAYLOAD_MAX_BYTES on the server). */
export const PAYLOAD_MAX_BYTES = 25 * 1024 * 1024;

export interface ComposerAttachment {
  /** Stable client-side id for list management. */
  cid: string;
  filename: string;
  /** Estimated bytes (base64 length × 0.75). */
  sizeBytes: number;
  contentType?: string;
  /** Base64-encoded file bytes (no data: prefix). */
  content: string;
}

export interface AttachmentsFieldProps {
  value: ComposerAttachment[];
  onChange: (next: ComposerAttachment[]) => void;
  disabled?: boolean;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readAsBase64(file: File): Promise<{ content: string; sizeBytes: number }> {
  const buf = await file.arrayBuffer();
  // Use Uint8Array → btoa chunked to avoid stack overflow on big files
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[]);
  }
  return { content: btoa(binary), sizeBytes: bytes.length };
}

export function AttachmentsField({ value, onChange, disabled }: AttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const totalBytes = value.reduce((sum, a) => sum + a.sizeBytes, 0);
  const overLimit = totalBytes > PAYLOAD_MAX_BYTES;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setReading(true);
    try {
      const next = [...value];
      let runningTotal = totalBytes;
      for (const file of Array.from(files)) {
        if (runningTotal + file.size > PAYLOAD_MAX_BYTES) {
          toast.error(`"${file.name}" would push total over ${humanSize(PAYLOAD_MAX_BYTES)}`);
          continue;
        }
        const { content, sizeBytes } = await readAsBase64(file);
        next.push({
          cid: crypto.randomUUID(),
          filename: file.name,
          sizeBytes,
          contentType: file.type || undefined,
          content,
        });
        runningTotal += sizeBytes;
      }
      onChange(next);
    } catch (err) {
      toast.error("Failed to read file", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(cid: string) {
    onChange(value.filter((a) => a.cid !== cid));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Attachments</Label>
        <span className={cn("text-[10px] tabular-nums", overLimit ? "text-destructive font-medium" : "text-muted-foreground")}>
          {humanSize(totalBytes)} / {humanSize(PAYLOAD_MAX_BYTES)}
        </span>
      </div>

      <div className="space-y-1.5">
        {value.length > 0 && (
          <ul className="space-y-1">
            {value.map((a) => (
              <li
                key={a.cid}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate font-medium">{a.filename}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {humanSize(a.sizeBytes)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.cid)}
                  aria-label={`Remove ${a.filename}`}
                  disabled={disabled}
                  className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive disabled:opacity-40"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || reading}
            className="gap-1.5"
          >
            {reading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
            {reading ? "Reading…" : value.length === 0 ? "Attach files" : "Add more files"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {overLimit && (
            <span className="flex items-center gap-1 text-[10px] text-destructive">
              <AlertTriangle className="size-3" />
              Total exceeds limit — remove files before sending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
