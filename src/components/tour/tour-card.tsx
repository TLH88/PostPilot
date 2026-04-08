"use client";

import { useCallback } from "react";
import { HelpCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useHelpSidebar } from "@/components/help-sidebar";
import type { CardComponentProps } from "nextstepjs";
import confetti from "canvas-confetti";

/**
 * Custom tour card component for NextStepjs.
 * Uses theme primary color background with white text.
 * Includes progress bar, navigation, help link, and confetti on final step.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const { openHelp } = useHelpSidebar();
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ffffff"],
        disableForReducedMotion: true,
      });
      skipTour?.(); // Close tour on finish
      return;
    }
    nextStep();
  }, [isLast, nextStep, skipTour]);

  const handleHelp = useCallback(() => {
    const helpArticle = (step as { helpArticle?: string }).helpArticle;
    if (helpArticle) {
      openHelp(helpArticle);
    } else {
      openHelp();
    }
  }, [step, openHelp]);

  return (
    <div className="relative z-[999] w-[360px] max-w-[calc(100vw-2rem)]">
      {/* Card */}
      <div className="rounded-2xl bg-primary text-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{step.icon}</span>
            <h3 className="text-[15px] font-bold leading-snug">{step.title}</h3>
          </div>
          <button
            onClick={() => skipTour?.()}
            className="flex size-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors shrink-0 ml-2"
            title="Close tour"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          <p className="text-[13px] leading-relaxed text-white/90">
            {step.content}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mx-5 mb-2">
          <div className="h-1 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          {/* Step counter */}
          <span className="text-[11px] text-white/70 font-medium">
            Step {currentStep + 1} of {totalSteps}
          </span>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1.5">
            {/* Help link */}
            <button
              onClick={handleHelp}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Need help?"
            >
              <HelpCircle className="size-3.5" />
            </button>

            {/* Back */}
            {!isFirst && (
              <button
                onClick={prevStep}
                className="flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-full bg-white text-primary px-3.5 py-1.5 text-xs font-semibold hover:bg-white/90 transition-colors"
            >
              {isLast ? (
                "Finish"
              ) : (
                <>
                  Next
                  <ChevronRight className="size-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow */}
      {arrow}
    </div>
  );
}
