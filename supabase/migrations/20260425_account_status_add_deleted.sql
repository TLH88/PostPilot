-- BP-131: extend the account_status CHECK constraint with a 'deleted' value.
--
-- Previously: {active, trial, suspended, churned}.
-- 'deleted' is meaningfully distinct from 'suspended' — it represents
-- the user-driven (or admin-driven) permanent-removal track:
--   - Soft delete sets account_status='deleted' + deletion_scheduled_for
--   - The hourly cron promotes pending_grace → hard delete on schedule.
-- 'suspended' continues to mean "admin moderation, potentially reversible".

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_account_status_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_account_status_check
  CHECK (account_status = ANY (ARRAY['active'::text, 'trial'::text, 'suspended'::text, 'churned'::text, 'deleted'::text]));

COMMENT ON CONSTRAINT user_profiles_account_status_check ON public.user_profiles IS
  'BP-131: added "deleted" to distinguish soft-deletion (user-driven, irreversible-after-grace) from "suspended" (admin moderation action, potentially reversible).';
