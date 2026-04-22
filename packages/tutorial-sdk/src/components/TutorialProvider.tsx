"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  TutorialContextValue,
  TutorialDefinition,
  TutorialEngineState,
  TutorialProviderProps,
} from "../core/types";
import { TutorialEngine } from "../core/engine";
import { setupActionDetector } from "../core/action-detector";
import { startTimer } from "../core/timer";
import { TutorialOverlay } from "./TutorialOverlay";

const DEFAULT_TIMEOUT = 15000;

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return ctx;
}

export function TutorialProvider({
  children,
  storage,
  onNavigate,
  currentPath,
  theme,
  onTutorialComplete,
  tutorialRegistry,
}: TutorialProviderProps) {
  const engineRef = useRef<TutorialEngine | null>(null);
  const actionCleanupRef = useRef<(() => void) | null>(null);
  const timerCleanupRef = useRef<(() => void) | null>(null);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new TutorialEngine({ storage, onNavigate });
  }

  const engine = engineRef.current;

  // Keep onNavigate in sync
  useEffect(() => {
    if (onNavigate) engine.setOnNavigate(onNavigate);
  }, [engine, onNavigate]);

  // Subscribe to engine state changes
  const [state, setState] = useState<TutorialEngineState>(engine.getState());

  useEffect(() => {
    return engine.subscribe(setState);
  }, [engine]);

  // ── Navigation awareness: close tutorial if user navigates away ────────
  //
  // BP-035 / Phase C.3: The previous implementation closed the tutorial
  // immediately on any unexpected path change. That tripped on transient
  // redirects (e.g. an OnboardingGuard briefly bouncing to /onboarding
  // and back to /dashboard) — the tutorial would die before the redirect
  // resolved. Fix: debounce by 600ms. If the path stays on the unexpected
  // value, close. If it bounces back to the expected value, do nothing.

  const lastTutorialPathRef = useRef<string | undefined>(currentPath);
  const NAV_AWAY_DEBOUNCE_MS = 600;

  useEffect(() => {
    if (!state.isActive || !state.activeTutorial) {
      lastTutorialPathRef.current = currentPath;
      return;
    }

    const step = state.activeTutorial.steps[state.currentStep];

    // If this step has a route, the tutorial is controlling navigation
    if (step?.route) {
      lastTutorialPathRef.current = step.route;
      return;
    }

    // If the step expects a navigate action, don't close (tutorial is waiting for navigation)
    if (step?.action === "navigate") {
      return;
    }

    // If the path changed and it wasn't the tutorial doing it, the user navigated away
    if (
      currentPath &&
      lastTutorialPathRef.current &&
      currentPath !== lastTutorialPathRef.current &&
      !currentPath.startsWith(lastTutorialPathRef.current + "/")
    ) {
      // Debounce: only close if the path stays on the new value. If it bounces
      // back (transient redirect), this effect re-runs and the timeout is
      // cleaned up before it fires.
      const closeTimer = setTimeout(() => {
        engine.close();
      }, NAV_AWAY_DEBOUNCE_MS);
      return () => clearTimeout(closeTimer);
    }

    lastTutorialPathRef.current = currentPath;
  }, [currentPath, state.isActive, state.activeTutorial, state.currentStep, engine]);

  // ── Action detection & timer setup per step ───────────────────────────
  //
  // BP-035 / Phase C.2: Replaced the fixed 1200ms setup delay with route-aware
  // gating. If the step has a route and we haven't arrived there yet, defer
  // setup — the effect will re-fire when `currentPath` updates. A small 300ms
  // cushion remains to give React a beat to commit the new page before we
  // attach action listeners. Steps without a route set up almost immediately.

  useEffect(() => {
    // Cleanup previous step's listeners
    actionCleanupRef.current?.();
    timerCleanupRef.current?.();
    actionCleanupRef.current = null;
    timerCleanupRef.current = null;

    if (!state.isActive || !state.activeTutorial) return;

    const step = state.activeTutorial.steps[state.currentStep];
    if (!step) return;

    // If the step expects to land on a specific route and we're not there yet,
    // defer. The effect re-fires on currentPath changes, picking us up once
    // navigation completes — no fixed-duration guess required.
    if (step.route && currentPath) {
      const onTargetRoute =
        currentPath === step.route ||
        currentPath.startsWith(step.route + "/");
      if (!onTargetRoute) return;
    }

    const POST_NAV_CUSHION_MS = 300;
    const setupDelay = setTimeout(() => {
      // Set up action detection for interactive steps
      if (state.mode === "interactive" && step.action && step.action !== "manual") {
        actionCleanupRef.current = setupActionDetector({
          step,
          onComplete: () => engine.notifyActionCompleted(),
          currentPath,
        });

        // Start timeout timer (skip for formInput since user needs time to type)
        if (step.action !== "formInput") {
          const timeout = step.timeout ?? DEFAULT_TIMEOUT;
          timerCleanupRef.current = startTimer(timeout, {
            onTick: (remaining) => engine.updateTimeoutRemaining(remaining),
            onTimeout: () => engine.notifyTimeout(),
          });
        }
      }
    }, POST_NAV_CUSHION_MS);

    return () => {
      clearTimeout(setupDelay);
      actionCleanupRef.current?.();
      timerCleanupRef.current?.();
    };
  }, [state.isActive, state.currentStep, state.activeTutorial, state.mode, currentPath, engine]);

  // ── Handle tutorial completion ────────────────────────────────────────

  useEffect(() => {
    if (!state.isActive && state.activeTutorial === null && onTutorialComplete) {
      // Tutorial just finished — this fires after engine.complete() resets state
      // We can't know which tutorial completed here, so we rely on the engine's complete() method
    }
  }, [state.isActive, state.activeTutorial, onTutorialComplete]);

  // ── Context value ─────────────────────────────────────────────────────

  const startTutorial = useCallback(
    (tutorial: TutorialDefinition) => engine.start(tutorial),
    [engine]
  );

  const closeTutorial = useCallback(() => engine.close(), [engine]);
  const nextStep = useCallback(() => {
    // Check for tutorial chaining on last step
    const currentState = engine.getState();
    if (
      currentState.activeTutorial &&
      currentState.currentStep >= currentState.activeTutorial.steps.length - 1 &&
      currentState.activeTutorial.chainToTutorialId &&
      tutorialRegistry
    ) {
      const chainedTutorial = tutorialRegistry[currentState.activeTutorial.chainToTutorialId];
      if (chainedTutorial) {
        engine.complete().then(() => {
          // Small delay to let completion persist before starting next
          setTimeout(() => engine.start(chainedTutorial), 500);
        });
        return;
      }
    }
    engine.next();
  }, [engine, tutorialRegistry]);
  const prevStep = useCallback(() => engine.prev(), [engine]);
  const goToStep = useCallback((i: number) => engine.goToStep(i), [engine]);
  const dismissTimeout = useCallback(() => engine.dismissTimeout(), [engine]);
  const skipStep = useCallback(() => engine.skipStep(), [engine]);

  const isTutorialCompleted = useCallback(
    (id: string) => storage.isCompleted(id),
    [storage]
  );

  const resetTutorial = useCallback(
    async (id: string) => {
      await storage.saveProgress(id, 0);
      // Clear completion — save progress with step 0 effectively resets
    },
    [storage]
  );

  const value = useMemo<TutorialContextValue>(
    () => ({
      startTutorial,
      closeTutorial,
      nextStep,
      prevStep,
      goToStep,
      isTutorialCompleted,
      resetTutorial,
      isActive: state.isActive,
      activeTutorialId: state.activeTutorial?.id ?? null,
      state,
      dismissTimeout,
      skipStep,
    }),
    [
      startTutorial,
      closeTutorial,
      nextStep,
      prevStep,
      goToStep,
      isTutorialCompleted,
      resetTutorial,
      state,
      dismissTimeout,
      skipStep,
    ]
  );

  // ── Theme CSS variables ───────────────────────────────────────────────

  const themeStyle = useMemo(() => {
    const defaults: Record<string, string> = {
      "--tutorial-primary": "#3b82f6",
      "--tutorial-primary-foreground": "#ffffff",
      "--tutorial-bg": "#ffffff",
      "--tutorial-bg-foreground": "#0a0a0a",
      "--tutorial-border": "#e5e7eb",
      "--tutorial-muted": "#f3f4f6",
      "--tutorial-muted-foreground": "#6b7280",
      "--tutorial-radius": "12px",
      "--tutorial-overlay-opacity": "0.65",
    };
    return { ...defaults, ...theme } as React.CSSProperties;
  }, [theme]);

  const currentStep =
    state.isActive && state.activeTutorial
      ? state.activeTutorial.steps[state.currentStep]
      : null;

  // Build list of other tutorials for the final step
  const otherTutorials = useMemo(() => {
    if (
      !state.activeTutorial?.showTutorialListOnFinish ||
      !tutorialRegistry
    )
      return undefined;
    const currentId = state.activeTutorial.id;
    return Object.values(tutorialRegistry)
      .filter((t) => t.id !== currentId)
      .map((t) => ({ id: t.id, name: t.name, description: t.description }));
  }, [state.activeTutorial, tutorialRegistry]);

  const handleStartOtherTutorial = useCallback(
    (tutorialId: string) => {
      if (!tutorialRegistry) return;
      const tutorial = tutorialRegistry[tutorialId];
      if (!tutorial) return;
      engine.close();
      setTimeout(() => engine.start(tutorial), 300);
    },
    [engine, tutorialRegistry]
  );

  // Apply theme variables to document root instead of a wrapper div
  useEffect(() => {
    const root = document.documentElement;
    const entries = Object.entries(themeStyle);
    entries.forEach(([key, val]) => {
      root.style.setProperty(key, val as string);
    });
    return () => {
      entries.forEach(([key]) => {
        root.style.removeProperty(key);
      });
    };
  }, [themeStyle]);

  return (
    <TutorialContext.Provider value={value}>
        {children}
        {state.isActive && currentStep && (
          <TutorialOverlay
            step={currentStep}
            currentStep={state.currentStep}
            totalSteps={state.activeTutorial!.steps.length}
            tutorialName={state.activeTutorial!.name}
            finishButtonText={state.activeTutorial!.finishButtonText}
            otherTutorials={otherTutorials}
            onStartTutorial={handleStartOtherTutorial}
            onNext={nextStep}
            onPrev={prevStep}
            onClose={closeTutorial}
            waitingForAction={state.waitingForAction}
            timeoutActive={state.timeoutActive}
            timeoutRemaining={state.timeoutRemaining}
            onDismissTimeout={dismissTimeout}
            onSkipStep={skipStep}
          />
        )}
    </TutorialContext.Provider>
  );
}
