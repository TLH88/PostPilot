-- BP-114 Step 2: Rename creator_profiles → user_profiles
--
-- The table captures the authenticated user's voice/profile settings, not
-- a "creator" concept. Renaming brings the table into line with v2
-- terminology (matches Subscription Model v2 and removes the
-- "Creator Profile" label from every UI surface).
--
-- Pg's ALTER TABLE RENAME is atomic and automatically updates:
--   - Foreign keys that reference this table
--   - RLS policies bound to the table
--   - Triggers
-- We additionally rename the auxiliary objects (PK, FK, trigger) so their
-- names reflect the new table. Index rename is a best-effort cleanup.

ALTER TABLE creator_profiles RENAME TO user_profiles;

-- Rename auxiliary objects that still carry the old name.
ALTER TABLE user_profiles
  RENAME CONSTRAINT creator_profiles_user_id_fkey TO user_profiles_user_id_fkey;

ALTER TABLE user_profiles
  RENAME CONSTRAINT creator_profiles_subscription_tier_check
  TO user_profiles_subscription_tier_check;

ALTER TABLE user_profiles
  RENAME CONSTRAINT creator_profiles_account_status_check
  TO user_profiles_account_status_check;

ALTER TABLE user_profiles
  RENAME CONSTRAINT creator_profiles_ai_provider_check
  TO user_profiles_ai_provider_check;

ALTER INDEX creator_profiles_pkey RENAME TO user_profiles_pkey;

ALTER TRIGGER set_updated_at_creator_profiles ON user_profiles
  RENAME TO set_updated_at_user_profiles;
