"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Reusable tag input. Enter or comma commits a tag. Backspace on an empty
 * input removes the last tag. Click the × on a chip to remove it. Duplicates
 * are silently deduped (case-insensitive). No external library.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter to add...",
  maxTags,
  disabled,
  className,
  id,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = typeof maxTags === "number" && value.length >= maxTags;

  function commitDraft() {
    const trimmed = draft.trim().replace(/^#+/, "");
    if (!trimmed) return;
    if (atLimit) return;

    // Case-insensitive dedupe
    const exists = value.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }

    onChange([...value, trimmed]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm transition-colors",
        "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={disabled || atLimit}
        className="flex-1 min-w-[8rem] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
      />
    </div>
  );
}
