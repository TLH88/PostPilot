/**
 * BP-142: Validate that a `user_profiles` row has every required onboarding
 * field. Used by:
 *
 *   - `/api/onboarding/complete` — gate before flipping `onboarding_completed=true`
 *   - Layout-level integrity gate — re-prompt completed users if a required
 *     field is missing (e.g. after a schema change adds a new requirement)
 *
 * Returns the list of missing field names so the caller can display a focused
 * "you still need X, Y, Z" message instead of "something is wrong."
 */

import {
  REQUIRED_FIELDS_FOR_COMPLETE,
  isFieldComplete,
  type ProfileField,
} from "./required-fields";

export interface OnboardingValidationResult {
  ok: boolean;
  missing: ProfileField[];
}

/**
 * Validate the profile against the master required-field list. Pass a partial
 * profile shape — keys absent from the input are treated as missing.
 */
export function validateOnboardingComplete(
  profile: Partial<Record<ProfileField, unknown>> | null | undefined
): OnboardingValidationResult {
  const missing: ProfileField[] = [];
  const p = profile ?? {};
  for (const field of REQUIRED_FIELDS_FOR_COMPLETE) {
    if (!isFieldComplete(p[field])) {
      missing.push(field);
    }
  }
  return { ok: missing.length === 0, missing };
}
