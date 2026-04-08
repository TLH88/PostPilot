"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay";
import {
  markTutorialCompleted,
  isTutorialCompleted as checkCompleted,
  resetTutorial as resetStorage,
} from "./tutorial-storage";
import type {
  TutorialDefinition,
  TutorialStep,
  TutorialEngineState,
  INITIAL_STATE,
} from "./tutorial-engine";

// ── Public API ──────────────────────────────────────────────────────────────

interface TutorialContextValue {
  startTutorial: (tutorial: TutorialDefinition) => void;
  closeTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  isTutorialCompleted: (name: string) => boolean;
  resetTutorial: (name: string) => void;
  isActive: boolean;
  activeTutorialId: string | null;
}

const TutorialContext = createContext<TutorialContextValue>({
  startTutorial: () => {},
  closeTutorial: () => {},
  nextStep: () => {},
  prevStep: () => {},
  isTutorialCompleted: () => false,
  resetTutorial: () => {},
  isActive: false,
  activeTutorialId: null,
});

export function useTutorial() {
  return useContext(TutorialContext);
}

// ── Provider ────────────────────────────────────────────────────────────────

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [tutorial, setTutorial] = useState<TutorialDefinition | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [waitingForAction, setWaitingForAction] = useState(false);

  const actionCleanupRef = useRef<(() => void) | null>(null);

  // Current step object
  const step: TutorialStep | null =
    tutorial && isActive ? tutorial.steps[currentStep] ?? null : null;

  // ── Action detection ──────────────────────────────────────────────────

  const setupActionDetection = useCallback(
    (stepDef: TutorialStep) => {
      // Clean up previous listener
      if (actionCleanupRef.current) {
        actionCleanupRef.current();
        actionCleanupRef.current = null;
      }

      if (!stepDef.waitFor || stepDef.waitFor === "manual") {
        setWaitingForAction(false);
        return;
      }

      setWaitingForAction(true);

      if (stepDef.waitFor === "click" && stepDef.clickTarget) {
        const checkAndListen = () => {
          const target = document.querySelector(stepDef.clickTarget!);
          if (!target) {
            // Element not yet in DOM, retry
            const retryTimer = setTimeout(checkAndListen, 500);
            actionCleanupRef.current = () => clearTimeout(retryTimer);
            return;
          }

          const handler = () => {
            setWaitingForAction(false);
            // Auto-advance after a short delay to let the click action complete
            setTimeout(() => {
              setCurrentStep((prev) => prev + 1);
            }, 600);
          };

          target.addEventListener("click", handler, { once: true });
          actionCleanupRef.current = () =>
            target.removeEventListener("click", handler);
        };

        // Delay to let DOM settle after navigation
        setTimeout(checkAndListen, 400);
      }

      if (stepDef.waitFor === "elementExists" && stepDef.waitForElement) {
        const checkElement = () => {
          const el = document.querySelector(stepDef.waitForElement!);
          if (el) {
            setWaitingForAction(false);
            setTimeout(() => {
              setCurrentStep((prev) => prev + 1);
            }, 600);
            return;
          }
          const timer = setTimeout(checkElement, 500);
          actionCleanupRef.current = () => clearTimeout(timer);
        };

        setTimeout(checkElement, 400);
      }

      if (stepDef.waitFor === "navigate" && stepDef.waitForRoute) {
        // Navigation detection is handled via the pathname useEffect below
        // Just set up the waiting state
      }
    },
    []
  );

  // Detect route changes for "navigate" action type
  useEffect(() => {
    if (!isActive || !step || step.waitFor !== "navigate" || !step.waitForRoute) return;

    if (pathname === step.waitForRoute || pathname?.startsWith(step.waitForRoute)) {
      setWaitingForAction(false);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 800);
    }
  }, [pathname, isActive, step]);

  // Set up action detection when step changes
  useEffect(() => {
    if (!isActive || !step) return;

    // Navigate to step's route if specified and different from current
    if (step.route && pathname !== step.route) {
      router.push(step.route);
      // Wait for navigation before setting up detection
      setTimeout(() => {
        if (step.waitFor && step.waitFor !== "manual") {
          setupActionDetection(step);
        }
      }, 1200);
    } else {
      if (step.waitFor && step.waitFor !== "manual") {
        setupActionDetection(step);
      } else {
        setWaitingForAction(false);
      }
    }

    return () => {
      if (actionCleanupRef.current) {
        actionCleanupRef.current();
        actionCleanupRef.current = null;
      }
    };
  }, [currentStep, isActive, step, pathname, router, setupActionDetection]);

  // ── Public methods ────────────────────────────────────────────────────

  const startTutorial = useCallback(
    (tutorialDef: TutorialDefinition) => {
      setTutorial(tutorialDef);
      setCurrentStep(0);
      setIsActive(true);
      setWaitingForAction(false);

      // Navigate to first step's route if specified
      if (tutorialDef.steps[0]?.route && pathname !== tutorialDef.steps[0].route) {
        router.push(tutorialDef.steps[0].route);
      }
    },
    [router, pathname]
  );

  const closeTutorial = useCallback(() => {
    if (tutorial) {
      markTutorialCompleted(tutorial.id);
    }
    setIsActive(false);
    setTutorial(null);
    setCurrentStep(0);
    setWaitingForAction(false);

    if (actionCleanupRef.current) {
      actionCleanupRef.current();
      actionCleanupRef.current = null;
    }
  }, [tutorial]);

  const handleNext = useCallback(() => {
    if (!tutorial) return;
    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [tutorial, currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      const prevStepDef = tutorial?.steps[currentStep - 1];
      if (prevStepDef?.route && pathname !== prevStepDef.route) {
        router.push(prevStepDef.route);
      }
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, tutorial, pathname, router]);

  const isTutorialCompleted = useCallback((name: string) => {
    return checkCompleted(name);
  }, []);

  const resetTutorialFn = useCallback((name: string) => {
    resetStorage(name);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        startTutorial,
        closeTutorial,
        nextStep: handleNext,
        prevStep: handlePrev,
        isTutorialCompleted,
        resetTutorial: resetTutorialFn,
        isActive,
        activeTutorialId: tutorial?.id ?? null,
      }}
    >
      {children}

      {/* Render overlay when tutorial is active */}
      {isActive && step && (
        <TutorialOverlay
          step={step}
          currentStep={currentStep}
          totalSteps={tutorial?.steps.length ?? 0}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={closeTutorial}
          waitingForAction={waitingForAction}
        />
      )}
    </TutorialContext.Provider>
  );
}
