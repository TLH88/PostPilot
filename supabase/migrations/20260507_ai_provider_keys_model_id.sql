-- Per-key model preference: lets each (user, provider, kind) row remember
-- which model the user picked for that provider, independent of the
-- single user_profiles.ai_model "active" pointer that the runtime AI
-- client still reads. When the active provider switches, sync
-- user_profiles.ai_model from the newly-active key's model_id.
--
-- Applied to remote project on 2026-05-07 via apply_migration MCP.
ALTER TABLE public.ai_provider_keys
  ADD COLUMN IF NOT EXISTS model_id text;
