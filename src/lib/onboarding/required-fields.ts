/**
 * BP-142: Source of truth for onboarding-required fields on `user_profiles`.
 *
 * Three uses:
 *   1. `/api/onboarding/step`  — per-step required-field validation
 *   2. `/api/onboarding/complete` — final completion gate
 *   3. Layout-level integrity gate — "user has profile but field went missing"
 *      detection (e.g. a future schema change adds a required field; existing
 *      completed users get re-prompted to fill it).
 *
 * Adding a new required field is a one-line change to either
 * `REQUIRED_FIELDS_PER_STEP` (if it lives on a wizard step) or
 * `EXTRA_REQUIRED_FIELDS_FOR_COMPLETE` (if it's set elsewhere, e.g. LinkedIn
 * connection from settings).
 */

/** Wizard step indexes — must stay in sync with `STEPS` in onboarding/page.tsx. */
export const STEP_INDEXES = {
  BASIC_INFO: 0,
  BACKGROUND: 1,
  EXPERTISE: 2,
  VOICE_STYLE: 3,
  AI_SETUP: 4,
  CONTENT_TOOLS: 5,
} as const;

export const TOTAL_STEPS = 6;

/** Tiers that skip the AI Setup (BYOK) step per BP-135 / Subscription Model v2. */
export const TIERS_WITHOUT_BYOK = new Set(["free", "personal"]);

/** Subset of `user_profiles` columns the wizard writes. */
export type ProfileField =
  | "full_name"
  | "headline"
  | "linkedin_url"
  | "resume_text"
  | "linkedin_about"
  | "expertise_areas"
  | "industries"
  | "target_audience"
  | "writing_tone"
  | "voice_samples"
  | "content_pillars"
  | "preferred_post_length"
  | "use_emojis"
  | "use_hashtags";

/**
 * Per-step required fields. Steps not listed here have no required fields
 * (Skip is allowed). Required-field steps disable Next + hide Skip in the UI
 * until satisfied; the API route also enforces server-side.
 */
export const REQUIRED_FIELDS_PER_STEP: Record<number, ProfileField[]> = {
  [STEP_INDEXES.BASIC_INFO]: ["full_name"],
  [STEP_INDEXES.BACKGROUND]: [],
  [STEP_INDEXES.EXPERTISE]: ["expertise_areas", "industries"],
  [STEP_INDEXES.VOICE_STYLE]: [],
  [STEP_INDEXES.AI_SETUP]: [],
  [STEP_INDEXES.CONTENT_TOOLS]: [],
};

/**
 * Aggregate required fields for completion. Sum of every step's required set
 * plus any non-step requirements (none today; if LinkedIn connection becomes
 * mandatory at completion time, add it here).
 */
export const REQUIRED_FIELDS_FOR_COMPLETE: ProfileField[] = Object.values(
  REQUIRED_FIELDS_PER_STEP
).flat();

/**
 * True when a value satisfies "non-empty" for its type:
 *   - string: trimmed length > 0
 *   - array:  length > 0
 *   - boolean: not coerced (always considered set)
 *   - else:   not null/undefined
 */
export function isFieldComplete(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Returns the visible step indexes for a given subscription tier. Free/Personal
 * skip the AI Setup step. The returned array is the canonical step-walking
 * order — UI navigation, server step-clamping, and progress display all use it.
 */
export function visibleStepsForTier(tier: string | null | undefined): number[] {
  const skipAi =
    tier !== null && tier !== undefined && TIERS_WITHOUT_BYOK.has(tier);
  return Array.from({ length: TOTAL_STEPS }, (_, i) => i).filter(
    (i) => !(skipAi && i === STEP_INDEXES.AI_SETUP)
  );
}
