"use client";

import { useCallback } from "react";
import { HelpCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useHelpSidebar } from "@/components/help-sidebar";
import { markTourCompleted } from "@/lib/tours/tour-storage";
import confetti from "canvas-confetti";
import type { CardComponentProps } from "onborda";

/**
 * Custom tour card component for Onborda.
 * Uses theme primary color background with white text.
 * Includes progress dots, navigation, help link, and confetti on final step.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const { openHelp } = useHelpSidebar();
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      // Fire confetti on tour completion
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ffffff"],
        disableForReducedMotion: true,
      });
      // Mark tour as completed (extract tour name from step data if available)
      // The provider handles this via onComplete callback
    }
    nextStep();
  }, [isLast, nextStep]);

  const handleHelp = useCallback(() => {
    // Access helpArticle from the step's content or icon metadata
    // We encode it in the step icon field as a workaround since Onborda
    // doesn't support custom fields on steps - we'll use a data attribute approach instead
    const helpArticle = (step as unknown as { helpArticle?: string }).helpArticle;
    if (helpArticle) {
      openHelp(helpArticle);
    } else {
      openHelp();
    }
  }, [step, openHelp]);

  return (
    <div className="relative w-[340px] max-w-[calc(100vw-2rem)]">
      {/* Card */}
      <div className="rounded-2xl bg-primary text-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{step.icon}</span>
            <h3 className="text-[15px] font-bold leading-snug">{step.title}</h3>
          </div>
          <button
            onClick={nextStep}
            className="flex size-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors shrink-0 ml-2"
            title="Skip tour"
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

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-5 h-2 bg-white"
                    : i < currentStep
                      ? "size-2 bg-white/60"
                      : "size-2 bg-white/25"
                }`}
              />
            ))}
          </div>

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
