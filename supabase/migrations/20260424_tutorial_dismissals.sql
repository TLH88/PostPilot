-- BP-121: tutorial "Don't show again" persistence.
--
-- Extends the existing tutorial_progress table with two columns so a user
-- can dismiss a specific tutorial without completing it. The dismissal
-- is per-tutorial (per existing PK user_id + tutorial_id), reversible
-- from Settings → Tutorials, and nukable via "Reset all tutorials".
--
-- Additive, nullable — no existing rows need updating, no existing code
-- paths break. Dismissal check is a new call site; legacy completed /
-- progress paths keep working as-is.

ALTER TABLE tutorial_progress
  ADD COLUMN IF NOT EXISTS dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN tutorial_progress.dismissed IS
  'User-initiated "Don''t show again" flag. When true, the engine will not surface this tutorial on eligible pages. Reversible from Settings.';

COMMENT ON COLUMN tutorial_progress.dismissed_at IS
  'When the user dismissed this tutorial. NULL until dismissed.';
