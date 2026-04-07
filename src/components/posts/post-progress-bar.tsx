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
    const normalizedStatus = status === "posted" ? "published" : status;
    // past_due maps to scheduled step
    const mappedStatus = normalizedStatus === "past_due" ? "scheduled" : normalizedStatus;
    const idx = steps.indexOf(mappedStatus);
    return idx === -1 ? 0 : idx;
  }

  const activeIndex = getActiveIndex();
  const isPublished = status === "posted";

  return (
    <div className="mb-4">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < activeIndex || isPublished;
          const isCurrent = i === activeIndex && !isPublished;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <Tooltip>
                <TooltipTrigger render={<div className="flex flex-col items-center gap-1 min-w-[70px]" />}>
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/30 bg-background text-muted-foreground/50"
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
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                      )}
                    >
                      {stepLabels[step]}
                    </span>
                    {/* Show scheduled date/time below the Scheduled step */}
                    {step === "scheduled" && scheduledFor && (isCurrent || isCompleted) && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 leading-tight text-center">
                        Publishing{" "}
                        {scheduledFor.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {scheduledFor.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
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
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
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
