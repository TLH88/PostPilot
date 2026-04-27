-- BP-028: Add metadata column to ai_usage_events for per-route context.
-- First use: recording the enhancement template key (add_hook, story_driven,
-- add_social_proof, improve_cta, tighten) so usage analytics can break down
-- which template is called most often.

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS metadata jsonb;
