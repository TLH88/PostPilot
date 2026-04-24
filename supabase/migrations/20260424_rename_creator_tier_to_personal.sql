-- BP-114 Step 1: Full tier key rename — "creator" → "personal"
--
-- On 2026-04-23 we renamed the tier's display label from "Creator" to
-- "Personal" in UI only. The internal key in the DB (subscription_tier,
-- original_tier, trial_tier, last_trial_tiers) remained "creator".
-- This migration completes the rename across every DB surface so the
-- internal key matches what the user sees.
--
-- Safe because: Stripe billing hasn't shipped yet (BP-015), so no external
-- system has "creator" cached as a product/price lookup value. The only
-- consumers of this column are PostPilot's own code, which is updated in
-- the same commit as this migration.

-- 0. Widen the CHECK constraint on subscription_tier FIRST to allow the
--    new value. The existing constraint hardcodes 'creator' and will block
--    an UPDATE otherwise. Replace with the v2 set and drop 'creator'.
ALTER TABLE creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_subscription_tier_check;

-- Temporarily accept both old and new values while the UPDATE runs, so
-- rows that haven't been flipped yet don't fail the constraint check.
ALTER TABLE creator_profiles
  ADD CONSTRAINT creator_profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'creator', 'personal', 'professional', 'team', 'enterprise'));

-- 1. subscription_tier: the active tier
UPDATE creator_profiles
   SET subscription_tier = 'personal'
 WHERE subscription_tier = 'creator';

-- 2. original_tier: captured before a trial started (so we can revert)
UPDATE creator_profiles
   SET original_tier = 'personal'
 WHERE original_tier = 'creator';

-- 3. trial_tier: the tier currently being trialed
UPDATE creator_profiles
   SET trial_tier = 'personal'
 WHERE trial_tier = 'creator';

-- 4. last_trial_tiers: JSONB map { tier_key → last_trial_date_iso }
--    Rewrite any "creator" key as "personal" and drop the old one.
UPDATE creator_profiles
   SET last_trial_tiers = (last_trial_tiers - 'creator')
                       || jsonb_build_object('personal', last_trial_tiers->'creator')
 WHERE last_trial_tiers ? 'creator';

-- 5. Now that every row is on 'personal', tighten the CHECK constraint to
--    remove 'creator' from the allowed set. Future writes will be rejected.
ALTER TABLE creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_subscription_tier_check;

ALTER TABLE creator_profiles
  ADD CONSTRAINT creator_profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'personal', 'professional', 'team', 'enterprise'));
