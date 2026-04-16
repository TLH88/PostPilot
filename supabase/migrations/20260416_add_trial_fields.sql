-- Trial system fields for account lifecycle management
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS original_tier text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS trial_tier text;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS last_trial_tiers jsonb NOT NULL DEFAULT '{}';

-- Free users should NOT get managed AI access by default
ALTER TABLE creator_profiles ALTER COLUMN managed_ai_access SET DEFAULT false;
ALTER TABLE creator_profiles ALTER COLUMN managed_ai_expires_at SET DEFAULT null;
