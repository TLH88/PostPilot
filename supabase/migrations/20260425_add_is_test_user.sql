-- BP-097: Mark dedicated E2E test users so admin/analytics queries can
-- filter them out and the idempotent seeder can safely upsert them.
--
-- NOT a security boundary. The flag is informational only — RLS on
-- user_profiles already scopes reads/writes to auth.uid() = user_id, and
-- no feature-gate checks read this column. If an attacker flips their
-- own is_test_user flag, nothing privileged happens.
--
-- Default false so every existing row (including the owner's own row)
-- stays marked as a real user without a backfill.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_test_user boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.is_test_user IS
  'BP-097: true for dedicated Playwright E2E test users (e2e+<tier>@mypostpilot.app). Informational — not a security boundary. Admin/analytics queries should filter this out.';

-- Optional partial index: small number of test users, large number of real
-- users. A partial index on the true side makes seeder upserts + future
-- admin filters fast without bloating the main user_profiles index space.
CREATE INDEX IF NOT EXISTS user_profiles_is_test_user_idx
  ON public.user_profiles (user_id)
  WHERE is_test_user = true;
