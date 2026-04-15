"use client";

import type { TutorialStep } from "../core/types";
import { OverviewCard } from "./templates/OverviewCard";
import { SimpleCard } from "./templates/SimpleCard";

export interface TutorialCardProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  tutorialName?: string;
  finishButtonText?: string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  waitingForAction: boolean;
  /** List of other tutorials to show on the final step */
  otherTutorials?: Array<{ id: string; name: string; description: string }>;
  /** Called when user picks a tutorial from the list */
  onStartTutorial?: (tutorialId: string) => void;
}

/**
 * Card shell that delegates to the appropriate template
 * based on the step's cardTemplate property.
 */
export function TutorialCard(props: TutorialCardProps) {
  const template = props.step.cardTemplate ?? "simple";

  switch (template) {
    case "overview":
      return <OverviewCard {...props} />;
    case "task":
      // Task template will be built in Phase 2
      return <SimpleCard {...props} />;
    case "simple":
    default:
      return <SimpleCard {...props} />;
  }
}
