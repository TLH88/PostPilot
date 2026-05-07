-- Replace hardcoded provider check constraints on ai_models and
-- ai_provider_keys with a FK to ai_providers.slug, so adding a new
-- provider only requires inserting one row in ai_providers — no
-- DDL/check-constraint churn for downstream tables.
--
-- Applied to remote project on 2026-05-07 via apply_migration MCP.

ALTER TABLE public.ai_models DROP CONSTRAINT IF EXISTS ai_models_provider_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_models_provider_fk'
  ) THEN
    ALTER TABLE public.ai_models
      ADD CONSTRAINT ai_models_provider_fk
      FOREIGN KEY (provider) REFERENCES public.ai_providers (slug)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END$$;

ALTER TABLE public.ai_provider_keys DROP CONSTRAINT IF EXISTS ai_provider_keys_provider_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_provider_keys_provider_fk'
  ) THEN
    ALTER TABLE public.ai_provider_keys
      ADD CONSTRAINT ai_provider_keys_provider_fk
      FOREIGN KEY (provider) REFERENCES public.ai_providers (slug)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END$$;
