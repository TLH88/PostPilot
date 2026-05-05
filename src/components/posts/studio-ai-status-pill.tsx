"use client";

/**
 * Studio AI status pill — sits in the Post Pilot AI panel header.
 *
 * Three coordinated visuals:
 *   1. Pulsing primary-tinted dot (always present; brighter while reading)
 *   2. Italic state label that swaps based on `state`
 *   3. Animated "reading bar" with a draft excerpt — only mounted while
 *      state === "reading". Uses the `ai-reading-bar` shimmer in globals.
 *
 * Mute toggle is owned by the parent (lives in the panel header next to
 * the close button). This component is purely presentational.
 */

import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioAIState = "reading" | "drafting" | "idle" | "paused" | "error";

interface StudioAIStatusPillProps {
  state: StudioAIState;
  /** First ~100 chars of the draft, shown in the reading bar. */
  excerpt?: string;
  /** Optional override label for non-default states (e.g. drafting flow). */
  labelOverride?: string;
  className?: string;
}

const LABELS: Record<StudioAIState, string> = {
  reading: "Reading your draft",
  drafting: "Drafting from your idea",
  idle: "Up to date",
  paused: "Paused",
  error: "Couldn't read this draft",
};

export function StudioAIStatusPill({
  state,
  excerpt,
  labelOverride,
  className,
}: StudioAIStatusPillProps) {
  const label = labelOverride ?? LABELS[state];
  const isActive = state === "reading" || state === "drafting";

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header dot + label */}
      <div className="flex items-center gap-1.5 text-[11px] italic text-muted-foreground">
        <span
          className={cn(
            "inline-block size-2 rounded-full transition-colors",
            isActive && "bg-primary animate-pulse-soft shadow-[0_0_6px_var(--primary)]",
            state === "idle" && "bg-primary/50",
            state === "paused" && "bg-muted-foreground/40",
            state === "error" && "bg-destructive/70",
          )}
        />
        <span>{label}…</span>
      </div>

      {/* Reading bar — only while a review is in flight */}
      {isActive && excerpt && (
        <div className="ai-reading-bar rounded-lg border border-primary/20 bg-primary/[0.06] px-2.5 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            {state === "drafting" ? "Drafting from your idea" : "Reading your draft"}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] italic leading-snug text-foreground/70">
            &ldquo;{excerpt}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}

interface MuteToggleProps {
  paused: boolean;
  onToggle: () => void;
  className?: string;
}

export function StudioAIMuteToggle({
  paused,
  onToggle,
  className,
}: MuteToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={paused ? "Resume Advanced Insights suggestions" : "Pause Advanced Insights suggestions"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {paused ? (
        <>
          <Play className="size-2.5" />
          Resume
        </>
      ) : (
        <>
          <Pause className="size-2.5" />
          Pause
        </>
      )}
    </button>
  );
}
