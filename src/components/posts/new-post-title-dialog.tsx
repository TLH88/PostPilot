"use client";

/**
 * BP-133: Modal that gates new post creation behind a required title.
 * Called from NewPostButton (manual) and the idea-to-post flow (pre-fills
 * the idea title as a default the user can edit).
 */
import { useState, useEffect, useRef } from "react";
import { FileEdit, Loader2 } from "lucide-react";
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

const MIN_CHARS = 3;
const MAX_CHARS = 200;

interface NewPostTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled default — e.g. the idea title. Empty string = no default. */
  defaultTitle?: string;
  /** Called with the trimmed title after the user submits. */
  onSubmit: (title: string) => Promise<void>;
  /** Whether the parent is in a loading/creating state. */
  submitting: boolean;
}

export function NewPostTitleDialog({
  open,
  onOpenChange,
  defaultTitle = "",
  onSubmit,
  submitting,
}: NewPostTitleDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync default title when it changes (e.g. dialog re-used for different ideas)
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setValidationError(null);
    }
  }, [open, defaultTitle]);

  // Auto-focus the input when the dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to let the dialog animate in before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleClose(value: boolean) {
    if (submitting) return;
    if (!value) {
      setTitle(defaultTitle);
      setValidationError(null);
    }
    onOpenChange(value);
  }

  function validate(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "Post title is required.";
    if (trimmed.length < MIN_CHARS)
      return `Title must be at least ${MIN_CHARS} characters.`;
    if (trimmed.length > MAX_CHARS)
      return `Title must be ${MAX_CHARS} characters or less.`;
    return null;
  }

  async function handleSubmit() {
    const trimmed = title.trim();
    const err = validate(trimmed);
    if (err) {
      setValidationError(err);
      inputRef.current?.focus();
      return;
    }
    setValidationError(null);
    await onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !submitting) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const charsLeft = MAX_CHARS - title.trim().length;
  const isOverLimit = charsLeft < 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="size-4 text-primary" />
            Name your post
          </DialogTitle>
          <DialogDescription>
            Give your post a title so you can find it easily later. You can
            always change it in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <Label htmlFor="new-post-title" className="text-sm font-medium">
            Post title <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={inputRef}
            id="new-post-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              // Clear the error as the user types so it doesn't feel sticky
              if (validationError) setValidationError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. My thoughts on building in public"
            maxLength={MAX_CHARS + 10} /* let them type slightly over so counter is visible */
            disabled={submitting}
            aria-describedby={validationError ? "new-post-title-error" : undefined}
            className={validationError ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          <div className="flex items-start justify-between gap-2 min-h-[1.25rem]">
            {validationError ? (
              <p
                id="new-post-title-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {validationError}
              </p>
            ) : (
              <span /> /* spacer */
            )}
            <p
              className={`text-xs shrink-0 ${
                isOverLimit
                  ? "text-destructive font-medium"
                  : charsLeft <= 20
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }`}
            >
              {isOverLimit ? `${Math.abs(charsLeft)} over limit` : `${charsLeft} remaining`}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || isOverLimit}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create post"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
