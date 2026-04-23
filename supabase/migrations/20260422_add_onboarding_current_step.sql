-- BP-103: Contextual onboarding CTA
-- Track which onboarding step the user is currently on so the dashboard
-- banner can show a resumable "Step X of N" CTA instead of a binary banner.
-- Additive, nullable — `onboarding_completed` remains the authoritative
-- completion flag and is untouched by this migration.
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS onboarding_current_step smallint;

COMMENT ON COLUMN creator_profiles.onboarding_current_step IS
  'Zero-indexed step the user last reached in onboarding. NULL if not started. Cleared when onboarding_completed flips to true.';
