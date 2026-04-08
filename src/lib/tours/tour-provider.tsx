"use client";

import { createContext, useContext, useCallback, useState } from "react";
import { NextStepProvider, NextStep, useNextStep } from "nextstepjs";
import { TourCard } from "@/components/tour/tour-card";
import { TOUR_DEFINITIONS } from "./tour-definitions";
import {
  markTourCompleted,
  isTourCompleted as checkCompleted,
  resetTour as resetStorage,
} from "./tour-storage";

// ── Public API (abstraction layer) ──────────────────────────────────────────

interface TourContextValue {
  startTour: (name: string) => void;
  closeTour: () => void;
  isTourCompleted: (name: string) => boolean;
  resetTour: (name: string) => void;
  activeTour: string | null;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  closeTour: () => {},
  isTourCompleted: () => false,
  resetTour: () => {},
  activeTour: null,
});

export function useTour() {
  return useContext(TourContext);
}

// ── Inner component that uses NextStep's hook ───────────────────────────────

function TourController({ children }: { children: React.ReactNode }) {
  const { startNextStep, closeNextStep } = useNextStep();
  const [activeTour, setActiveTour] = useState<string | null>(null);

  const startTour = useCallback(
    (name: string) => {
      setActiveTour(name);
      startNextStep(name);
    },
    [startNextStep]
  );

  const closeTour = useCallback(() => {
    if (activeTour) {
      markTourCompleted(activeTour);
    }
    closeNextStep();
    setActiveTour(null);
  }, [closeNextStep, activeTour]);

  const isTourCompleted = useCallback((name: string) => {
    return checkCompleted(name);
  }, []);

  const resetTourFn = useCallback((name: string) => {
    resetStorage(name);
  }, []);

  return (
    <TourContext.Provider
      value={{
        startTour,
        closeTour,
        isTourCompleted,
        resetTour: resetTourFn,
        activeTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

// ── Convert step definitions to NextStep format ─────────────────────────────

const nextStepTours = TOUR_DEFINITIONS.map((tour) => ({
  tour: tour.tour,
  steps: tour.steps.map((s) => ({
    icon: <>{s.icon}</>,
    title: s.title,
    content: <>{s.content}</>,
    selector: s.selector,
    side: s.side as "top" | "bottom" | "left" | "right",
    showControls: s.showControls,
    showSkip: true,
    pointerPadding: s.pointerPadding,
    pointerRadius: s.pointerRadius,
    nextRoute: s.nextRoute,
    prevRoute: s.prevRoute,
    // Custom property for help article
    helpArticle: s.helpArticle,
  })),
}));

// ── Provider wrapper ────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextStepProvider>
      <NextStep
        steps={nextStepTours}
        shadowRgb="55,48,163"
        shadowOpacity="0.7"
        cardComponent={TourCard}
        onComplete={(tourName) => {
          if (tourName) markTourCompleted(tourName);
        }}
        onSkip={(_step, tourName) => {
          if (tourName) markTourCompleted(tourName);
        }}
      >
        <TourController>{children}</TourController>
      </NextStep>
    </NextStepProvider>
  );
}
