-- 2026-05-12 — DALL-E removed from the image model picker. The Vercel AI
-- Gateway doesn't expose dall-e-* on its image-generation catalog, so
-- system-path users couldn't pick them anyway and BYOK users have the
-- modern gpt-image-* family as a better option.
--
-- Setting is_active = false (rather than DELETE) preserves history and
-- lets us reactivate cleanly if the gateway ever adds support.
UPDATE ai_models
SET is_active = false
WHERE provider = 'openai'
  AND model_id IN ('dall-e-3', 'dall-e-2')
  AND kind = 'image';
