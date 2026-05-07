-- AI provider registry + extensibility scaffolding for BYOK redesign.
-- Adds an ai_providers table as the metadata source of truth for the
-- settings UI; extends ai_models with kind and last_fetched_at to
-- support both text and image models in one place + per-provider refresh
-- staleness tracking.
--
-- Applied to remote project on 2026-05-07 via apply_migration MCP. This
-- file is the repo-of-record copy for reproducibility.

-- 1. Provider registry
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  placeholder text NOT NULL,
  capabilities text[] NOT NULL DEFAULT ARRAY['text']::text[],
  help_url text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ai_models additions: kind ('text' | 'image') and last_fetched_at
ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_models_kind_check'
  ) THEN
    ALTER TABLE public.ai_models
      ADD CONSTRAINT ai_models_kind_check CHECK (kind IN ('text', 'image'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ai_models_provider_kind_active_idx
  ON public.ai_models (provider, kind, is_active);

-- 3. Seed the four currently-supported providers
INSERT INTO public.ai_providers (slug, label, placeholder, capabilities, help_url, sort_order)
VALUES
  ('anthropic',  'Anthropic (Claude)',       'sk-ant-...', ARRAY['text']::text[],          'https://console.anthropic.com/settings/keys', 10),
  ('openai',     'OpenAI (GPT / o-series)',  'sk-...',     ARRAY['text','image']::text[],  'https://platform.openai.com/api-keys',         20),
  ('google',     'Google (Gemini)',          'AIza...',    ARRAY['text','image']::text[],  'https://aistudio.google.com/app/apikey',       30),
  ('perplexity', 'Perplexity (Sonar)',       'pplx-...',   ARRAY['text']::text[],          'https://www.perplexity.ai/settings/api',       40)
ON CONFLICT (slug) DO NOTHING;

-- 4. RLS: provider metadata is readable by any authenticated user
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_providers_read_authenticated" ON public.ai_providers;
CREATE POLICY "ai_providers_read_authenticated" ON public.ai_providers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- updated_at trigger (mirrors pattern used elsewhere in the project)
CREATE OR REPLACE FUNCTION public.touch_ai_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_providers_touch_updated_at ON public.ai_providers;
CREATE TRIGGER ai_providers_touch_updated_at
  BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ai_providers_updated_at();
