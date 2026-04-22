import type {
  TutorialDefinition,
  TutorialEngineState,
  TutorialStorageAdapter,
} from "./types";

const INITIAL_STATE: TutorialEngineState = {
  activeTutorial: null,
  currentStep: 0,
  isActive: false,
  mode: null,
  waitingForAction: false,
  timeoutActive: false,
  timeoutRemaining: 0,
};

type Listener = (state: TutorialEngineState) => void;

export interface TutorialEngineOptions {
  storage: TutorialStorageAdapter;
  onNavigate?: (path: string) => void;
  userId?: string;
}

/**
 * Framework-agnostic tutorial state machine.
 * React integration happens via the subscribe pattern (similar to Zustand).
 */
export class TutorialEngine {
  private state: TutorialEngineState = { ...INITIAL_STATE };
  private listeners = new Set<Listener>();
  private storage: TutorialStorageAdapter;
  private onNavigate?: (path: string) => void;
  private userId?: string;

  constructor(options: TutorialEngineOptions) {
    this.storage = options.storage;
    this.onNavigate = options.onNavigate;
    this.userId = options.userId;
  }

  // ── State Access ─────────────────────────────────────────────────────────

  getState(): TutorialEngineState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.state = { ...this.state }; // New reference for React re-renders
    this.listeners.forEach((fn) => fn(this.state));
  }

  // ── Tutorial Lifecycle ───────────────────────────────────────────────────

  async start(tutorial: TutorialDefinition) {
    // Check for saved progress
    let startStep = 0;
    try {
      const saved = await this.storage.getProgress(
        tutorial.id,
        this.userId
      );
      if (saved > 0 && saved < tutorial.steps.length) {
        startStep = saved;
      }
    } catch {
      // No saved progress, start from beginning
    }

    const firstStep = tutorial.steps[startStep];
    const needsAction =
      tutorial.mode === "interactive" &&
      !!firstStep?.action &&
      firstStep.action !== "manual";

    this.state = {
      activeTutorial: tutorial,
      currentStep: startStep,
      isActive: true,
      mode: tutorial.mode,
      waitingForAction: needsAction,
      timeoutActive: false,
      timeoutRemaining: 0,
    };
    this.emit();

    // Navigate to the first step's route if needed
    this.navigateToStepRoute(startStep);
  }

  async next() {
    if (!this.state.activeTutorial) return;
    const nextStep = this.state.currentStep + 1;

    if (nextStep >= this.state.activeTutorial.steps.length) {
      // Tutorial complete
      await this.complete();
      return;
    }

    this.state.currentStep = nextStep;
    const nextAction = this.state.activeTutorial.steps[nextStep].action;
    this.state.waitingForAction =
      this.state.mode === "interactive" &&
      !!nextAction &&
      nextAction !== "manual";
    this.state.timeoutActive = false;
    this.state.timeoutRemaining = 0;
    this.emit();

    // Save progress
    this.saveProgressQuietly(nextStep);

    // Navigate if step has a route
    this.navigateToStepRoute(nextStep);
  }

  prev() {
    if (!this.state.activeTutorial || this.state.currentStep <= 0) return;

    const prevStep = this.state.currentStep - 1;
    this.state.currentStep = prevStep;
    this.state.waitingForAction =
      this.state.mode === "interactive" &&
      !!this.state.activeTutorial.steps[prevStep].action;
    this.state.timeoutActive = false;
    this.state.timeoutRemaining = 0;
    this.emit();

    this.navigateToStepRoute(prevStep);
  }

  goToStep(index: number) {
    if (!this.state.activeTutorial) return;
    if (index < 0 || index >= this.state.activeTutorial.steps.length) return;

    this.state.currentStep = index;
    this.state.waitingForAction =
      this.state.mode === "interactive" &&
      !!this.state.activeTutorial.steps[index].action;
    this.state.timeoutActive = false;
    this.state.timeoutRemaining = 0;
    this.emit();

    this.saveProgressQuietly(index);
    this.navigateToStepRoute(index);
  }

  close() {
    // BP-035 / Phase A.2: Preserve progress when the user closes mid-tutorial
    // so they can resume later. The previous implementation called
    // saveProgressQuietly(0) on every close, wiping the user's place — which
    // made the resume-from-saved-step logic in start() effectively dead code.
    //
    // Behavior now:
    //   - If the user closes while in progress, leave the saved current_step
    //     alone. start() will pick them up where they left off.
    //   - If the user was on the last step (or beyond), call complete()
    //     instead of close() — that's a separate code path.
    this.state = { ...INITIAL_STATE };
    this.emit();
  }

  async complete() {
    const tutorialId = this.state.activeTutorial?.id;
    this.state = { ...INITIAL_STATE };
    this.emit();

    if (tutorialId) {
      try {
        await this.storage.markCompleted(tutorialId, this.userId);
      } catch {
        // Silently fail — don't break the UX
      }
    }
  }

  /**
   * Called by the action detector when the user completes the required action.
   */
  notifyActionCompleted() {
    if (!this.state.waitingForAction) return;

    this.state.waitingForAction = false;
    this.state.timeoutActive = false;
    this.state.timeoutRemaining = 0;
    this.emit();

    // Auto-advance after a short delay
    setTimeout(() => this.next(), 400);
  }

  /**
   * Called by the timer when it expires — shows the timeout prompt.
   */
  notifyTimeout() {
    this.state.timeoutActive = true;
    this.state.timeoutRemaining = 0;
    this.emit();
  }

  /**
   * Update the remaining time display (called by timer tick).
   */
  updateTimeoutRemaining(remaining: number) {
    this.state.timeoutRemaining = remaining;
    this.emit();
  }

  /**
   * Dismiss the timeout prompt and restart the timer.
   */
  dismissTimeout() {
    this.state.timeoutActive = false;
    this.emit();
  }

  /**
   * Skip the current step (from timeout prompt).
   */
  skipStep() {
    this.state.timeoutActive = false;
    this.next();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private navigateToStepRoute(stepIndex: number) {
    if (!this.state.activeTutorial || !this.onNavigate) return;
    const step = this.state.activeTutorial.steps[stepIndex];
    if (step.route) {
      this.onNavigate(step.route);
    }
  }

  private async saveProgressQuietly(step: number) {
    if (!this.state.activeTutorial) return;
    try {
      await this.storage.saveProgress(
        this.state.activeTutorial.id,
        step,
        this.userId
      );
    } catch {
      // Silently fail
    }
  }

  /**
   * Update the onNavigate callback (when host app re-renders).
   */
  setOnNavigate(fn: (path: string) => void) {
    this.onNavigate = fn;
  }

  /**
   * Update the userId (when auth state changes).
   */
  setUserId(id: string | undefined) {
    this.userId = id;
  }
}
