"use client";

/**
 * Compact horizontal status pipeline for the editor header.
 *
 * Replaces the full-width <PostProgressBar>. Renders as a row of small dots
 * + uppercase labels separated by short connector lines, e.g.:
 *
 *     ● DRAFT  ──  ○ REVIEW  ──  ○ SCHEDULED  ──  ○ PUBLISHED
 *
 * The active step is filled and primary-colored; future steps are muted.
 * Tooltip on hover gives the full status meaning + relevant date.
 */

import { cn } from "@/lib/utils";
import { hasFeature } from "@/lib/feature-gate";
import type { SubscriptionTier } from "@/lib/constants";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface PostStatusPipelineProps {
  status: string;
  userTier: SubscriptionTier;
  scheduledFor?: Date | null;
  scheduledAt?: Date | null;
  createdAt?: Date | null;
  postedAt?: Date | null;
  /** Title of the source idea, if this post was developed from one. When
   *  set, an "Idea" step is prepended to the pipeline (always completed). */
  sourceIdeaTitle?: string | null;
  className?: string;
}

const STEP_TOOLTIPS: Record<string, string> = {
  idea: "Started from an idea in your Idea Bank",
  draft: "Write and refine your post content",
  review: "Team members review before publishing",
  scheduled: "Post is queued for automatic publishing",
  published: "Post has been published to LinkedIn",
};

const STEP_LABELS: Record<string, string> = {
  idea: "Idea",
  draft: "Draft",
  review: "Review",
  scheduled: "Scheduled",
  published: "Published",
};

function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

export function PostStatusPipeline({
  status,
  userTier,
  scheduledFor,
  scheduledAt,
  createdAt,
  postedAt,
  sourceIdeaTitle,
  className,
}: PostStatusPipelineProps) {
  const hasReview = hasFeature(userTier, "review_status");
  const fromIdea = !!sourceIdeaTitle;
  const baseSteps = hasReview
    ? ["draft", "review", "scheduled", "published"]
    : ["draft", "scheduled", "published"];
  const steps = fromIdea ? ["idea", ...baseSteps] : baseSteps;
  const draftIndex = steps.indexOf("draft");

  function getActiveIndex(): number {
    if (status === "posted") return steps.length;
    if (status === "scheduled" || status === "past_due") return steps.indexOf("published");
    if (status === "review") return steps.indexOf("review");
    return draftIndex;
  }

  const activeIndex = getActiveIndex();
  const isPublished = status === "posted";

  function dateForStep(step: string): string | null {
    if (step === "idea" && sourceIdeaTitle) return sourceIdeaTitle;
    if (step === "draft" && createdAt) return formatDateTime(createdAt);
    if (step === "scheduled" && (scheduledAt || scheduledFor)) {
      return formatDateTime(scheduledAt ?? scheduledFor!);
    }
    if (step === "published" && isPublished && postedAt) return formatDateTime(postedAt);
    if (step === "published" && !isPublished && scheduledFor) {
      return `Publishing ${formatDateTime(scheduledFor)}`;
    }
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {steps.map((step, i) => {
        const isCompleted = i < activeIndex || isPublished;
        const isCurrent = i === activeIndex && !isPublished;
        const isFuture = !isCompleted && !isCurrent;
        const date = dateForStep(step);

        return (
          <div key={step} className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger render={<div className="flex items-center gap-1.5 cursor-default" />}>
                {/* Status dot — green=complete, blue+pulse=current, gray=future */}
                {isCurrent ? (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500 opacity-70" />
                    <span className="relative inline-flex size-full rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full transition-colors",
                      isCompleted && "bg-green-500",
                      isFuture && "bg-muted-foreground/30",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "transition-colors",
                    isCompleted && "text-green-600 dark:text-green-400",
                    isCurrent && "text-blue-600 dark:text-blue-400",
                    isFuture && "text-muted-foreground/60",
                  )}
                >
                  {STEP_LABELS[step]}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="space-y-0.5">
                  <div>{STEP_TOOLTIPS[step]}</div>
                  {date && <div className="text-[11px] opacity-80">{date}</div>}
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Connector — green when leading into a completed step, gray otherwise */}
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px w-6 transition-colors",
                  i < activeIndex || isPublished
                    ? "bg-green-500/60"
                    : "bg-muted-foreground/20",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
