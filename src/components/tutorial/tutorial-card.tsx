"use client";

import { useCallback } from "react";
import { HelpCircle, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { useHelpSidebar } from "@/components/help-sidebar";
import confetti from "canvas-confetti";
import type { TutorialStep } from "@/lib/tutorials/tutorial-engine";

interface TutorialCardProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  waitingForAction: boolean;
}

/**
 * Tutorial instruction card. Primary-colored with white text.
 * Shows progress bar, navigation, help link, and confetti on finish.
 * In interactive mode, shows "waiting" state when expecting user action.
 */
export function TutorialCard({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onClose,
  waitingForAction,
}: TutorialCardProps) {
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
      onClose();
      return;
    }
    onNext();
  }, [isLast, onNext, onClose]);

  const handleHelp = useCallback(() => {
    if (step.helpArticle) {
      openHelp(step.helpArticle);
    } else {
      openHelp();
    }
  }, [step.helpArticle, openHelp]);

  return (
    <div className="w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-2xl bg-primary text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{step.icon}</span>
            <h3 className="text-[15px] font-bold leading-snug">{step.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors shrink-0 ml-2"
            title="Close tutorial"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          <p className="text-[13px] leading-relaxed text-white/90">
            {step.content}
          </p>
          {/* Waiting indicator for interactive mode */}
          {waitingForAction && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-white/10 text-[11px] text-white/80">
              <Loader2 className="size-3 animate-spin" />
              <span>Go ahead, try it! The tutorial will continue when you're done.</span>
            </div>
          )}
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
                onClick={onPrev}
                className="flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}

            {/* Next / Finish (disabled when waiting for action) */}
            <button
              onClick={handleNext}
              disabled={waitingForAction}
              className="flex items-center gap-1 rounded-full bg-white text-primary px-3.5 py-1.5 text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLast ? (
                "Finish"
              ) : waitingForAction ? (
                "Waiting..."
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
    </div>
  );
}
