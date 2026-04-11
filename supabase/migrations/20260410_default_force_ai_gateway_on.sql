-- Make Vercel AI Gateway the default routing for all users.
-- Existing users are flipped ON so their AI requests start benefiting from
-- automatic fallbacks, unified billing, and prompt caching immediately.
-- They can still opt out via the Settings toggle if they prefer BYOK direct.

UPDATE creator_profiles SET force_ai_gateway = true WHERE force_ai_gateway = false;

ALTER TABLE creator_profiles ALTER COLUMN force_ai_gateway SET DEFAULT true;
