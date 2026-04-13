/**
 * Tutorial Engine - State machine for guided tutorials.
 *
 * Supports three tutorial modes:
 * - "interactive": User performs real actions, engine validates and advances
 * - "slideshow": Animated screenshot transitions (overview tours)
 * - "video": Embedded video player with chapter markers
 *
 * Action detection types for interactive mode:
 * - "click": Wait for user to click a specific element
 * - "navigate": Wait for route change to a specific path
 * - "elementExists": Wait for a DOM element to appear
 * - "manual": User clicks "Next" manually
 */

export type TutorialMode = "interactive" | "slideshow" | "video";

export type ActionType = "click" | "navigate" | "elementExists" | "manual";

export interface TutorialStep {
  /** Step icon (emoji) */
  icon: string;
  /** Step title */
  title: string;
  /** Step description */
  content: string;
  /** CSS selector for the target element to highlight */
  selector?: string;
  /** Which side to show the card */
  side?: "top" | "bottom" | "left" | "right";
  /** Padding around the spotlight highlight */
  pointerPadding?: number;
  /** Border radius of the spotlight */
  pointerRadius?: number;
  /** Help article ID for "Need help?" link */
  helpArticle?: string;
  /** Route to navigate to before showing this step */
  route?: string;

  // ── Interactive mode fields ──
  /** What action to wait for before advancing */
  waitFor?: ActionType;
  /** Selector for the element the user should click (for waitFor: "click") */
  clickTarget?: string;
  /** Route to wait for (for waitFor: "navigate") */
  waitForRoute?: string;
  /** Selector for element to wait for (for waitFor: "elementExists") */
  waitForElement?: string;

  // ── Slideshow mode fields ──
  /** Screenshot image path for slideshow mode */
  screenshotUrl?: string;
  /** Highlighted region on the screenshot [x, y, width, height] as percentages */
  highlightRegion?: [number, number, number, number];
}

export interface TutorialDefinition {
  /** Unique tutorial ID */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Tutorial mode */
  mode: TutorialMode;
  /** Category for grouping in Help Center */
  category: "overview" | "howto";
  /** Steps */
  steps: TutorialStep[];
  /** Video URL (for video mode) */
  videoUrl?: string;
  /** Related tutorial IDs to show on completion */
  relatedTutorials?: string[];
  /** Related help article IDs */
  relatedArticles?: string[];
}

// ── Engine state ────────────────────────────────────────────────────────────

export interface TutorialEngineState {
  activeTutorial: TutorialDefinition | null;
  currentStep: number;
  isActive: boolean;
  mode: TutorialMode | null;
  /** Whether the engine is waiting for user action (interactive mode) */
  waitingForAction: boolean;
}

export const INITIAL_STATE: TutorialEngineState = {
  activeTutorial: null,
  currentStep: 0,
  isActive: false,
  mode: null,
  waitingForAction: false,
};
