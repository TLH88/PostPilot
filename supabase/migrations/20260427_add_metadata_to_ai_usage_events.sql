-- BP-026: Add metadata jsonb column to ai_usage_events for route-specific flags.
-- First use: trending boolean for brainstorm route.

ALTER TABLE ai_usage_events ADD COLUMN IF NOT EXISTS metadata jsonb;
