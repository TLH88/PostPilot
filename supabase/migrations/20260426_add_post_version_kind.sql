-- BP-141: Add `kind` column to post_versions to distinguish autosave
-- snapshots from user-initiated manual versions.
--
-- Values: 'manual' (default, existing behaviour) | 'auto' (autosave snapshots).
-- Existing rows get 'manual' retroactively via DEFAULT.
--
-- Retention: auto-kind rows are capped at 20 per post by a trigger that
-- prunes the oldest ones on each INSERT.

-- 1. Add the column
ALTER TABLE public.post_versions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'manual'
  CHECK (kind IN ('manual', 'auto'));

COMMENT ON COLUMN public.post_versions.kind IS
  'BP-141: "manual" = user clicked Save Version; "auto" = autosave snapshot. Autosave snapshots are hidden in the UI by default and capped at 20 per post.';

-- 2. Index to support fast "last auto snapshot" lookups (per-post, kind filter)
CREATE INDEX IF NOT EXISTS post_versions_post_id_kind_idx
  ON public.post_versions (post_id, kind, version_number DESC);

-- 3. Prune function: keep only the 20 most-recent auto-kind rows per post
--    after each INSERT. Fires only when the newly-inserted row is kind='auto'.
CREATE OR REPLACE FUNCTION public.prune_auto_post_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only prune when inserting an auto snapshot
  IF NEW.kind = 'auto' THEN
    DELETE FROM public.post_versions
    WHERE post_id = NEW.post_id
      AND kind = 'auto'
      AND id NOT IN (
        SELECT id
        FROM public.post_versions
        WHERE post_id = NEW.post_id
          AND kind = 'auto'
        ORDER BY version_number DESC
        LIMIT 20
      );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_prune_auto_post_versions ON public.post_versions;

CREATE TRIGGER trg_prune_auto_post_versions
  AFTER INSERT ON public.post_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prune_auto_post_versions();
