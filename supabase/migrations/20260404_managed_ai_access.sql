-- BP-054: Managed AI Access — System Keys & Trial Access
-- Auto-grants 14-day AI access to new accounts using system-level API keys

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS managed_ai_access boolean NOT NULL DEFAULT true;

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS managed_ai_expires_at timestamptz DEFAULT (now() + interval '14 days');
