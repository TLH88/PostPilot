-- 2026-05-12 — Sync ai_models image catalog with the Vercel AI Gateway's
-- image-capable model list.
--
-- Owner direction 2026-05-12: gpt-5-nano is the recommended default for
-- system-path image generation (lower input/output cost, more capable
-- than the gpt-image-* family for the typical post-image use case).
--
-- The /api/models endpoint serves DB rows when present and falls back to
-- the adapter's staticModels() list otherwise. Before this migration the
-- DB held only 3 OpenAI + 1 Google image rows, hiding the rest of the
-- gateway-exposed models from the picker. After this migration the DB
-- mirrors the full gateway catalog.

-- ── OpenAI ────────────────────────────────────────────────────────────────
UPDATE ai_models
SET is_default = false, sort_order = sort_order + 10
WHERE provider = 'openai' AND kind = 'image';

INSERT INTO ai_models (provider, model_id, kind, label, is_active, is_default, sort_order)
VALUES
  ('openai', 'gpt-5-nano',        'image', 'GPT-5 Nano (recommended)', true, true,  0),
  ('openai', 'gpt-5.1-thinking',  'image', 'GPT-5.1 Thinking',         true, false, 1),
  ('openai', 'gpt-5',             'image', 'GPT-5',                    true, false, 2),
  ('openai', 'gpt-5-pro',         'image', 'GPT-5 Pro',                true, false, 3),
  ('openai', 'gpt-image-1',       'image', 'GPT Image 1',              true, false, 4),
  ('openai', 'gpt-image-1-mini',  'image', 'GPT Image 1 Mini',         true, false, 5),
  ('openai', 'gpt-image-1.5',     'image', 'GPT Image 1.5',            true, false, 6),
  ('openai', 'gpt-image-2',       'image', 'GPT Image 2',              true, false, 7),
  ('openai', 'dall-e-3',          'image', 'DALL-E 3',                 true, false, 8),
  ('openai', 'dall-e-2',          'image', 'DALL-E 2',                 true, false, 9)
ON CONFLICT (provider, model_id) DO UPDATE
SET kind       = EXCLUDED.kind,
    label      = EXCLUDED.label,
    is_active  = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    sort_order = EXCLUDED.sort_order;

-- ── Google ───────────────────────────────────────────────────────────────
UPDATE ai_models
SET is_default = false, sort_order = sort_order + 10
WHERE provider = 'google' AND kind = 'image';

INSERT INTO ai_models (provider, model_id, kind, label, is_active, is_default, sort_order)
VALUES
  ('google', 'gemini-3.1-flash-image-preview', 'image', 'Gemini 3.1 Flash Image (Preview)', true, true,  0),
  ('google', 'gemini-3-pro-image',             'image', 'Gemini 3 Pro Image',               true, false, 1),
  ('google', 'gemini-2.5-flash-image',         'image', 'Gemini 2.5 Flash Image',           true, false, 2),
  ('google', 'imagen-4.0-ultra-generate-001',  'image', 'Imagen 4 Ultra',                   true, false, 3),
  ('google', 'imagen-4.0-generate-001',        'image', 'Imagen 4',                         true, false, 4),
  ('google', 'imagen-4.0-fast-generate-001',   'image', 'Imagen 4 Fast',                    true, false, 5)
ON CONFLICT (provider, model_id) DO UPDATE
SET kind       = EXCLUDED.kind,
    label      = EXCLUDED.label,
    is_active  = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    sort_order = EXCLUDED.sort_order;
