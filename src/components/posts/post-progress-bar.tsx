"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasFeature } from "@/lib/feature-gate";
import type { SubscriptionTier } from "@/lib/constants";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface PostProgressBarProps {
  status: string;
  userTier: SubscriptionTier;
  scheduledFor?: Date | null;
  createdAt?: Date | null;
  postedAt?: Date | null;
}

function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

const STEP_TOOLTIPS: Record<string, string> = {
  draft: "Write and refine your post content",
  review: "Team members review before publishing",
  scheduled: "Post is queued for automatic publishing",
  published: "Post has been published to LinkedIn",
};

export function PostProgressBar({
  status,
  userTier,
  scheduledFor,
  createdAt,
  postedAt,
}: PostProgressBarProps) {
  const hasReview = hasFeature(userTier, "review_status");

  const steps = hasReview
    ? ["draft", "review", "scheduled", "published"]
    : ["draft", "scheduled", "published"];

  const stepLabels: Record<string, string> = {
    draft: "Draft",
    review: "Review",
    scheduled: "Scheduled",
    published: "Published",
  };

  // Map post status to step index
  function getActiveIndex(): number {
    if (status === "posted") return steps.length; // all complete
    if (status === "scheduled" || status === "past_due") return steps.indexOf("published");
    if (status === "review") return steps.indexOf("review");
    return 0; // draft
  }

  const activeIndex = getActiveIndex();
  const isPublished = status === "posted";

  return (
    <div className="mb-4 rounded-xl bg-primary px-4 py-3 shadow-sm">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < activeIndex || isPublished;
          const isCurrent = i === activeIndex && !isPublished;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <Tooltip>
                <TooltipTrigger render={<div className="flex flex-col items-center gap-1 min-w-[70px] cursor-default" />}>
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                        isCompleted
                          ? "border-white bg-white text-primary"
                          : isCurrent
                            ? "border-white bg-white/20 text-white"
                            : "border-white/30 bg-transparent text-white/40"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium text-center leading-tight",
                        isCompleted || isCurrent
                          ? "text-white"
                          : "text-white/50"
                      )}
                    >
                      {stepLabels[step]}
                    </span>
                    {/* Draft: show created date */}
                    {step === "draft" && createdAt && isCompleted && (
                      <span className="text-[10px] text-white/70 leading-tight text-center">
                        {formatDateTime(createdAt)}
                      </span>
                    )}
                    {/* Scheduled: show when it was scheduled */}
                    {step === "scheduled" && scheduledFor && isCompleted && (
                      <span className="text-[10px] text-white/70 leading-tight text-center">
                        {formatDateTime(scheduledFor)}
                      </span>
                    )}
                    {/* Published: show publish date if posted, or upcoming date if scheduled */}
                    {step === "published" && isPublished && postedAt && (
                      <span className="text-[10px] text-white/70 leading-tight text-center">
                        {formatDateTime(postedAt)}
                      </span>
                    )}
                    {step === "published" && !isPublished && scheduledFor && isCurrent && (
                      <span className="text-[10px] text-white/80 leading-tight text-center">
                        Publishing {formatDateTime(scheduledFor)}
                      </span>
                    )}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {STEP_TOOLTIPS[step]}
                </TooltipContent>
              </Tooltip>

              {/* Connector line between steps */}
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 mt-[-24px]",
                    i < activeIndex || isPublished
                      ? "bg-white"
                      : "bg-white/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
