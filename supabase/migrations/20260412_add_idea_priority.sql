-- Add priority column to ideas for user-assigned triage (low/medium/high).
-- Nullable on purpose: users shouldn't be forced to triage every captured
-- idea. "No priority" is a valid state that appears in the default bucket.

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS priority text
    CHECK (priority IN ('low', 'medium', 'high'));
