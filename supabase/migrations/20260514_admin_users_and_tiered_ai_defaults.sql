-- BP-174: Admin user management + tier × kind AI defaults
--
-- Two changes shipped together because they share the admin/system page:
--
-- 1. admin_users — DB-backed list of admin emails. Lets the owner add/
--    remove admins from the UI instead of editing ADMIN_EMAILS in Vercel.
--    Env var stays as bootstrap (so we can always recover from a wiped DB).
--    isAdminEmail() will check both.
--
-- 2. system_ai_defaults — replaces the singleton system_ai_config. Stores
--    one row per (tier, kind) pair so admins can pick separate text and
--    image defaults for Free/Personal vs Pro+. Old singleton remains for
--    one release as a fallback during deploy crossover.

-- ─────────────────────────────────────────────────────────────────────
-- admin_users
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  added_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  notes      text
);

-- Case-insensitive uniqueness — admins always compare emails lowercased.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower
  ON public.admin_users (lower(email));

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only. The admin API routes use the service
-- role client to read/write; end users never touch this table directly.

COMMENT ON TABLE public.admin_users IS
  'BP-174: DB-backed admin list. Owner manages via /admin/system. ADMIN_EMAILS env var stays as bootstrap.';

-- ─────────────────────────────────────────────────────────────────────
-- system_ai_defaults — tier × kind matrix
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_ai_defaults (
  tier          text NOT NULL CHECK (tier IN ('free_personal', 'pro_plus')),
  kind          text NOT NULL CHECK (kind IN ('text', 'image')),
  provider      text NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'perplexity')),
  model         text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (tier, kind)
);

-- Seed all four (tier × kind) slots with cost-effective defaults that
-- match what's currently active in the ai_models table.
INSERT INTO public.system_ai_defaults (tier, kind, provider, model) VALUES
  ('free_personal', 'text',  'openai', 'gpt-4.1-mini'),
  ('free_personal', 'image', 'openai', 'gpt-image-1-mini'),
  ('pro_plus',      'text',  'anthropic', 'claude-sonnet-4-6'),
  ('pro_plus',      'image', 'openai', 'gpt-image-1')
ON CONFLICT (tier, kind) DO NOTHING;

ALTER TABLE public.system_ai_defaults ENABLE ROW LEVEL SECURITY;

-- Authenticated users can READ defaults (consumer code in routes reads
-- per-request). Writes go through the admin API via service role.
CREATE POLICY "system_ai_defaults_read_authenticated"
  ON public.system_ai_defaults
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.system_ai_defaults IS
  'BP-174: tier × kind default provider/model for system-key AI calls. Replaces system_ai_config singleton.';
