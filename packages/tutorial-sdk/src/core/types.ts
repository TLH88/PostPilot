// ─── Tutorial Modes ──────────────────────────────────────────────────────────

/** Interactive = guided with action detection; Informational = just next/prev */
export type TutorialMode = "interactive" | "informational";

/** Types of actions a step can require the user to perform */
export type ActionType =
  | "click"
  | "navigate"
  | "elementExists"
  | "formInput"
  | "manual";

/** Available card template designs */
export type CardTemplate = "overview" | "task" | "simple";

// ─── Step Configuration ──────────────────────────────────────────────────────

/** Positioning for a tutorial card relative to an element or viewport */
export interface StepPosition {
  /** Anchor to a DOM element (via selector) or float in viewport */
  anchor: "element" | "viewport";
  /** Which side of the target element to place the card */
  side?: "top" | "bottom" | "left" | "right";
  /** Fixed pixel offset from left (viewport anchor) */
  x?: number;
  /** Fixed pixel offset from top (viewport anchor) */
  y?: number;
}

/** Media to display in the card's media slot */
export interface StepMedia {
  type: "video" | "gif" | "animation";
  /** URL for video or gif files */
  src?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Poster image for video (shown before play) */
  poster?: string;
  /** Configuration for live browser animation (Phase 2) */
  animationConfig?: LiveAnimationConfig;
}

/** Configuration for programmatic cursor/interaction animations */
export interface LiveAnimationConfig {
  steps: AnimationAction[];
}

export interface AnimationAction {
  action: "moveTo" | "click" | "type" | "scroll" | "wait" | "highlight";
  /** CSS selector for the target element */
  target?: string;
  /** Text to type (for 'type' action) */
  value?: string;
  /** Duration in milliseconds */
  duration?: number;
}

// ─── Tutorial Step ───────────────────────────────────────────────────────────

export interface TutorialStep {
  /** Unique step identifier */
  id: string;
  /** Step title displayed in the card */
  title: string;
  /** Step description/instructions */
  content: string;
  /** Optional emoji or icon identifier */
  icon?: string;
  /** Media to display in the card (video, gif, or animation) */
  media?: StepMedia;
  /** CSS selector for the spotlight target element */
  selector?: string;
  /** Card positioning */
  position?: StepPosition;
  /** Action the user must perform to advance (interactive mode) */
  action?: ActionType;
  /** CSS selector for the element the user must click */
  clickTarget?: string;
  /** Route the user must navigate to */
  waitForRoute?: string;
  /** CSS selector for an element that must appear */
  waitForElement?: string;
  /** Route to navigate to before showing this step */
  route?: string;
  /** Timeout in ms before showing help prompt (default: 15000) */
  timeout?: number;
  /** Which card template to render */
  cardTemplate?: CardTemplate;
}

// ─── Tutorial Definition ─────────────────────────────────────────────────────

export interface TutorialDefinition {
  /** Unique tutorial identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description of what this tutorial covers */
  description: string;
  /** Category for grouping (e.g., "onboarding", "overview", "howto") */
  category: string;
  /** Tutorial mode */
  mode: TutorialMode;
  /** Ordered list of steps */
  steps: TutorialStep[];
  /** Minimum subscription tier required (optional) */
  requiredTier?: string;
  /** IDs of related tutorials */
  relatedTutorials?: string[];
  /** Tutorial ID to offer launching when this tutorial completes */
  chainToTutorialId?: string;
  /** Custom text for the final step's action button (e.g., "Create your first post →") */
  finishButtonText?: string;
  /** Custom text for the decline option when chaining (e.g., "No thanks, I'll explore on my own") */
  chainDeclineText?: string;
  /** Show a list of other tutorials on the final step */
  showTutorialListOnFinish?: boolean;
}

// ─── Engine State ────────────────────────────────────────────────────────────

export interface TutorialEngineState {
  activeTutorial: TutorialDefinition | null;
  currentStep: number;
  isActive: boolean;
  mode: TutorialMode | null;
  waitingForAction: boolean;
  /** Whether the timeout prompt is showing */
  timeoutActive: boolean;
  /** Milliseconds remaining before timeout fires */
  timeoutRemaining: number;
}

// ─── Storage Adapter ─────────────────────────────────────────────────────────

export interface TutorialStorageAdapter {
  /** Mark a tutorial as completed */
  markCompleted(tutorialId: string, userId?: string): Promise<void>;
  /** Check if a tutorial has been completed */
  isCompleted(tutorialId: string, userId?: string): Promise<boolean>;
  /** Get the current step index for a tutorial in progress */
  getProgress(tutorialId: string, userId?: string): Promise<number>;
  /** Save the current step index */
  saveProgress(
    tutorialId: string,
    step: number,
    userId?: string
  ): Promise<void>;
  /** Check if this is the user's first login (tutorial prompt not yet shown) */
  isFirstLogin(userId?: string): Promise<boolean>;
  /** Record that the first-login prompt was shown and the user's response */
  markFirstLoginPromptShown(
    userId?: string,
    response?: "accepted" | "declined"
  ): Promise<void>;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface TutorialTheme {
  "--tutorial-primary"?: string;
  "--tutorial-primary-foreground"?: string;
  "--tutorial-bg"?: string;
  "--tutorial-bg-foreground"?: string;
  "--tutorial-border"?: string;
  "--tutorial-muted"?: string;
  "--tutorial-muted-foreground"?: string;
  "--tutorial-radius"?: string;
  "--tutorial-overlay-opacity"?: string;
}

// ─── Provider Props ──────────────────────────────────────────────────────────

export interface TutorialProviderProps {
  children: React.ReactNode;
  /** Storage adapter for persisting tutorial state */
  storage: TutorialStorageAdapter;
  /** Callback to navigate to a route (e.g., router.push) */
  onNavigate?: (path: string) => void;
  /** Current route path (host app keeps this in sync) */
  currentPath?: string;
  /** Theme overrides */
  theme?: TutorialTheme;
  /** Callback when a tutorial is completed */
  onTutorialComplete?: (tutorialId: string) => void;
  /** Registry of all tutorials (needed for tutorial chaining) */
  tutorialRegistry?: Record<string, TutorialDefinition>;
}

// ─── Context Value ───────────────────────────────────────────────────────────

export interface TutorialContextValue {
  /** Start a tutorial */
  startTutorial: (tutorial: TutorialDefinition) => void;
  /** Close the active tutorial */
  closeTutorial: () => void;
  /** Advance to the next step */
  nextStep: () => void;
  /** Go back to the previous step */
  prevStep: () => void;
  /** Jump to a specific step */
  goToStep: (index: number) => void;
  /** Check if a tutorial has been completed */
  isTutorialCompleted: (tutorialId: string) => Promise<boolean>;
  /** Reset a tutorial's completion state */
  resetTutorial: (tutorialId: string) => Promise<void>;
  /** Whether a tutorial is currently active */
  isActive: boolean;
  /** The active tutorial's ID */
  activeTutorialId: string | null;
  /** Current engine state */
  state: TutorialEngineState;
  /** Dismiss the timeout prompt */
  dismissTimeout: () => void;
  /** Skip the current step */
  skipStep: () => void;
}
