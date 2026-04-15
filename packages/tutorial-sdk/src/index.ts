// ─── Core ────────────────────────────────────────────────────────────────────
export { TutorialEngine } from "./core/engine";
export type {
  TutorialDefinition,
  TutorialStep,
  TutorialMode,
  ActionType,
  CardTemplate,
  StepPosition,
  StepMedia,
  LiveAnimationConfig,
  AnimationAction,
  TutorialEngineState,
  TutorialTheme,
  TutorialProviderProps,
  TutorialContextValue,
} from "./core/types";

// ─── Storage ─────────────────────────────────────────────────────────────────
export type { TutorialStorageAdapter } from "./core/types";
export { LocalStorageAdapter } from "./storage/local-storage";
export { SupabaseAdapter } from "./storage/supabase";
export type { SupabaseClientLike } from "./storage/supabase";

// ─── React Components ────────────────────────────────────────────────────────
export { TutorialProvider, useTutorial } from "./components/TutorialProvider";
export { TutorialGate } from "./components/TutorialGate";
export { TutorialCard } from "./components/TutorialCard";
export { TutorialOverlay } from "./components/TutorialOverlay";
export { TimeoutPrompt } from "./components/TimeoutPrompt";
export { OverviewCard } from "./components/templates/OverviewCard";
export { SimpleCard } from "./components/templates/SimpleCard";

export { BorderBeam } from "./components/BorderBeam";

// ─── Animations (Phase 2 stubs) ─────────────────────────────────────────────
export { LiveAnimationPlayer } from "./animations/LiveAnimationPlayer";
