-- Seed image-gen models so the UI has rows to show before any cron
-- run or user-triggered Test refresh has populated the catalog.
-- Mirrors the static fallback lists in:
--   src/lib/ai/adapters/openai.ts (STATIC_IMAGE)
--   src/lib/ai/adapters/google.ts (STATIC_IMAGE)
-- These will be replaced by live data once the daily refresh-models
-- cron runs (or any user clicks Test on an image-capable key).
--
-- Applied to remote project on 2026-05-07 via apply_migration MCP.

INSERT INTO public.ai_models (provider, model_id, label, kind, is_default, is_active, sort_order)
VALUES
  ('openai', 'gpt-image-1',  'GPT Image 1 (recommended)', 'image', true,  true, 0),
  ('openai', 'dall-e-3',     'DALL-E 3',                  'image', false, true, 1),
  ('openai', 'dall-e-2',     'DALL-E 2',                  'image', false, true, 2),
  ('google', 'gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image (Preview)', 'image', true, true, 0)
ON CONFLICT (provider, model_id) DO UPDATE SET
  kind = EXCLUDED.kind,
  label = EXCLUDED.label,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
