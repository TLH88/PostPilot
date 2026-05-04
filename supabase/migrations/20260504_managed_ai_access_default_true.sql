-- BP-151 / UF-015: align managed_ai_access default with documented intent.
--
-- Memory note feedback_ai_access_default.md captures the policy: "All active
-- and trial users get system AI access by default; BYOK is a Pro+ option,
-- never required for normal usage."
--
-- The user_profiles.managed_ai_access column has been DEFAULT false since
-- BP-054 — predating the Subscription Model v2 default-on policy. New free
-- users have therefore been provisioned with managed_ai_access=false even
-- though resolveAIAccess() falls back to "managed_admin" for any
-- account_status='active' user. The DB / documented-intent mismatch is
-- harmless today (the resolver compensates) but trips audits and confuses
-- any future code path that reads the column directly.
--
-- This migration:
--   1. Changes the column default from false to true.
--   2. Backfills existing free + personal rows where the column is currently
--      false AND account_status is active or trial.
--   3. Leaves rows belonging to deleted, suspended, or cancelled accounts
--      untouched — they should not gain AI access on this migration.
--
-- The BP-142 /api/onboarding/step bootstrap already writes
-- managed_ai_access=true explicitly, so new wizard signups have the right
-- value regardless of the default — but the default is now consistent.

ALTER TABLE public.user_profiles
  ALTER COLUMN managed_ai_access SET DEFAULT true;

UPDATE public.user_profiles
SET managed_ai_access = true,
    updated_at = now()
WHERE managed_ai_access = false
  AND account_status IN ('active', 'trial')
  AND subscription_tier IN ('free', 'personal');
