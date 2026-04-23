-- BP-111: Proactive LinkedIn Token Validation
-- Tracks the last time we successfully validated the stored LinkedIn access
-- token against LinkedIn's /v2/userinfo endpoint. Used by the validate route
-- to throttle calls to at most one per user per hour.
-- Additive, nullable — does not change any existing auth/publish flow.
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS linkedin_token_validated_at timestamptz;

COMMENT ON COLUMN creator_profiles.linkedin_token_validated_at IS
  'Last successful validation of the stored LinkedIn access token via /v2/userinfo. NULL if never validated.';
