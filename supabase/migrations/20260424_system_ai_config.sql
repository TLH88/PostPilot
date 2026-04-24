-- BP-117 Phase D: admin-controlled default system AI provider + model
--
-- Stores the single default used for all system-key calls (Free + Personal +
-- Pro-without-BYOK). Admins can change the values at any time from the admin
-- dashboard without a deploy — routes read fresh from this table.
--
-- Singleton pattern: exactly one row, id=1 enforced by CHECK constraint.
-- The cost study (2026-04-24) recommended gpt-4.1-mini as the default; this
-- seeds that choice but it can be flipped to claude-haiku-4-5 or
-- gemini-2.5-flash from the UI.

CREATE TABLE IF NOT EXISTS system_ai_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_provider TEXT NOT NULL CHECK (default_provider IN ('openai', 'anthropic', 'google', 'perplexity')),
  default_model TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed with the cost-study-approved default.
INSERT INTO system_ai_config (id, default_provider, default_model)
VALUES (1, 'openai', 'gpt-4.1-mini')
ON CONFLICT (id) DO NOTHING;

-- RLS: readable by any authenticated user (routes need it), writable only via
-- service_role (admin endpoints use createAdminClient). No end-user writes.
ALTER TABLE system_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read system_ai_config"
  ON system_ai_config
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users — writes go
-- through the service_role client from admin endpoints only.
