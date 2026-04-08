"use client";

import { createContext, useContext, useCallback, useState, useEffect } from "react";
import { OnbordaProvider, Onborda, useOnborda } from "onborda";
import { TourCard } from "@/components/tour/tour-card";
import { TOUR_DEFINITIONS } from "./tour-definitions";
import {
  markTourCompleted,
  isTourCompleted as checkCompleted,
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

// ── Inner component that uses Onborda's hook ────────────────────────────────

function TourController({ children }: { children: React.ReactNode }) {
  const { startOnborda, closeOnborda, currentTour, currentStep } = useOnborda();
  const [activeTour, setActiveTour] = useState<string | null>(null);

  // Track when a tour finishes (last step dismissed)
  useEffect(() => {
    if (activeTour && !currentTour) {
      // Tour was closed - mark as completed
      markTourCompleted(activeTour);
      setActiveTour(null);
    }
  }, [currentTour, activeTour]);

  const startTour = useCallback(
    (name: string) => {
      setActiveTour(name);
      startOnborda(name);
    },
    [startOnborda]
  );

  const closeTour = useCallback(() => {
    if (activeTour) {
      markTourCompleted(activeTour);
    }
    closeOnborda();
    setActiveTour(null);
  }, [closeOnborda, activeTour]);

  const isTourCompleted = useCallback((name: string) => {
    return checkCompleted(name);
  }, []);

  const resetTourFn = useCallback(
    (name: string) => {
      const { resetTour: resetStorage } = require("./tour-storage");
      resetStorage(name);
    },
    []
  );

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

// ── Provider wrapper ────────────────────────────────────────────────────────

// Convert our step definitions to Onborda's format
const onbordaSteps = TOUR_DEFINITIONS.map((tour) => ({
  tour: tour.tour,
  steps: tour.steps.map((s) => ({
    icon: <>{s.icon}</>,
    title: s.title,
    content: <>{s.content}</>,
    selector: s.selector,
    side: s.side,
    showControls: s.showControls,
    pointerPadding: s.pointerPadding,
    pointerRadius: s.pointerRadius,
    nextRoute: s.nextRoute,
    prevRoute: s.prevRoute,
    // Pass helpArticle through as custom property
    helpArticle: s.helpArticle,
  })),
}));

export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <OnbordaProvider>
      <Onborda
        steps={onbordaSteps}
        showOnborda={true}
        shadowRgb="55,48,163"
        shadowOpacity="0.7"
        cardComponent={TourCard}
        cardTransition={{ duration: 0.3, type: "tween" }}
      >
        <TourController>{children}</TourController>
      </Onborda>
    </OnbordaProvider>
  );
}
