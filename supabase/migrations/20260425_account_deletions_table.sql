-- BP-131: Account deletion audit + soft-delete state.
--
-- Two structures:
--
-- 1. account_deletions: append-only audit log capturing who deleted whom,
--    what type of delete (soft|hard), email/name snapshots taken BEFORE
--    the cascade fires (so the audit row remains readable after the
--    auth.users row is gone), and the lifecycle status. user_id uses
--    ON DELETE SET NULL so the row survives the eventual hard delete.
--
-- 2. user_profiles deletion-state columns: track soft-delete state
--    inline so feature gates / login checks can short-circuit cheaply
--    without joining the audit table.
--
-- Why a separate audit table (vs. activity_log): activity_log rows
-- cascade-delete with the user, which would erase the audit trail
-- precisely when we most need it. account_deletions persists.

CREATE TABLE IF NOT EXISTS public.account_deletions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The account being (or that was) deleted. NULL after hard delete.
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Snapshots — survive the cascade.
  user_email    text NOT NULL,
  user_full_name text,
  user_subscription_tier text,

  -- Who initiated the deletion.
  --   - For self-serve: same as user_id (also set NULL on cascade).
  --   - For admin-initiated: the admin's auth.users id.
  initiated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  initiated_by_role text NOT NULL CHECK (initiated_by_role IN ('self', 'admin')),

  -- Soft (30-day grace) or hard (immediate, irreversible).
  deletion_type text NOT NULL CHECK (deletion_type IN ('soft', 'hard')),

  -- Lifecycle.
  status text NOT NULL CHECK (status IN ('pending_grace', 'hard_deleted', 'restored', 'cancelled')),

  -- Timestamps.
  initiated_at  timestamptz NOT NULL DEFAULT now(),
  scheduled_hard_delete_at timestamptz,
  hard_deleted_at timestamptz,
  restored_at   timestamptz,

  -- Free-text reason (admin can supply; user supplies via self-serve form, optional).
  reason        text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_deletions_user_id_idx
  ON public.account_deletions (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS account_deletions_pending_grace_idx
  ON public.account_deletions (scheduled_hard_delete_at)
  WHERE status = 'pending_grace';

COMMENT ON TABLE public.account_deletions IS
  'BP-131: append-only audit log of all account deletions (soft + hard, admin + self). Rows survive the deletion of the user_id they reference; email/name snapshots make the audit usable post-cascade.';

-- RLS: users see their own pending deletion only (so the UI can show
-- "Account scheduled for deletion on X" before hard delete fires).
-- Admin views go through the service-role-protected API route, which
-- bypasses RLS by design — that's where the ADMIN_EMAILS check lives
-- (see src/lib/supabase/admin.ts → verifyAdmin). No DB-level is_admin
-- column exists in this project, so we don't try to express the admin
-- check in RLS.
--
-- INSERT / UPDATE / DELETE are not granted to authenticated. Writes
-- only happen through service-role code paths.
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own pending deletion"
ON public.account_deletions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- user_profiles deletion-state columns
-- ─────────────────────────────────────────────────────────────────────
-- These mirror the active record from account_deletions for cheap
-- in-line gating (login check, feature gates, etc. don't need the join).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS user_profiles_pending_deletion_idx
  ON public.user_profiles (deletion_scheduled_for)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.deleted_at IS
  'BP-131: timestamp the soft delete was initiated. NULL = active account. NOT NULL but deletion_scheduled_for in the future = grace period.';

COMMENT ON COLUMN public.user_profiles.deletion_scheduled_for IS
  'BP-131: when the cron will hard-delete the soft-deleted account. NULL = no scheduled deletion. Cron scans for past dates and executes.';
