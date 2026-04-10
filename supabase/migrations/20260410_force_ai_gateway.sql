-- Add force_ai_gateway toggle for testing AI Gateway routing
-- When true, AI requests bypass the user's BYOK keys and route through
-- the Vercel AI Gateway instead (requires AI_GATEWAY_API_KEY env var).
-- Primarily a dev/testing aid to verify gateway routing without removing keys.

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS force_ai_gateway boolean NOT NULL DEFAULT false;
