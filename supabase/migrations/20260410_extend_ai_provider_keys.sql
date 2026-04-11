-- Extend ai_provider_keys to support image generation keys and track test status

-- Support image generation keys in the same table as text AI keys
ALTER TABLE ai_provider_keys
  ADD COLUMN IF NOT EXISTS key_type text NOT NULL DEFAULT 'text'
    CHECK (key_type IN ('text', 'image'));

-- Track last successful test so the UI can show "Configured" vs "Untested"
ALTER TABLE ai_provider_keys
  ADD COLUMN IF NOT EXISTS tested_at timestamptz;

-- Replace UNIQUE(user_id, provider) with (user_id, provider, key_type)
-- so users can have separate text + image keys for the same provider
ALTER TABLE ai_provider_keys DROP CONSTRAINT IF EXISTS ai_provider_keys_user_id_provider_key;

ALTER TABLE ai_provider_keys
  ADD CONSTRAINT ai_provider_keys_user_provider_type_key
  UNIQUE (user_id, provider, key_type);
