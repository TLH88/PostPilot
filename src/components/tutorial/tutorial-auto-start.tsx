"use client";

import { useEffect } from "react";
import { useTutorial } from "@/lib/tutorials/tutorial-provider";
import { TUTORIAL_REGISTRY } from "@/lib/tutorials/tutorial-definitions";

/**
 * Auto-starts a tutorial on mount if it hasn't been completed yet.
 * Place in a server component page to trigger on first visit.
 */
export function TutorialAutoStart({ tutorialId }: { tutorialId: string }) {
  const { startTutorial, isTutorialCompleted } = useTutorial();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isTutorialCompleted(tutorialId)) {
        const tutorial = TUTORIAL_REGISTRY[tutorialId];
        if (tutorial) {
          startTutorial(tutorial);
        }
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [tutorialId, startTutorial, isTutorialCompleted]);

  return null;
}
