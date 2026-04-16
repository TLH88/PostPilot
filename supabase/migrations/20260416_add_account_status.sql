-- Add account_status to creator_profiles
-- Tracks user lifecycle state independently of subscription tier
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS account_status text
  NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'trial', 'suspended', 'churned'));

-- Backfill: set users with active managed AI trial to 'trial' status
UPDATE creator_profiles
SET account_status = 'trial'
WHERE managed_ai_access = true
  AND managed_ai_expires_at IS NOT NULL
  AND managed_ai_expires_at > now();
