-- BP-145: Add structured failure_category column to posts.
--
-- The Edge Function (publish-scheduled-posts) currently writes a free-text
-- `publish_error` string when a scheduled post fails. The client then runs a
-- fragile heuristic (humanizePublishError) over that string to decide whether
-- the failure was a revoked token, expired token, rate-limit, etc.
--
-- This migration adds an enum-checked `failure_category` column so the Edge
-- Function can classify the error at write time. The recovery surface
-- (/posts/recovery) reads `failure_category` first; legacy past_due rows
-- without a category fall back to the existing humanizePublishError parser.
--
-- Categories (kept in sync with src/types/index.ts PostFailureCategory):
--   linkedin_auth_revoked     — LinkedIn revoked the token; user must reconnect
--   linkedin_auth_expired     — Token expired and refresh failed; reconnect
--   linkedin_rate_limited     — 429 from LinkedIn; retry later
--   linkedin_content_rejected — 422 / content policy; user must edit
--   linkedin_content_too_long — Exceeds character limit; user must edit
--   linkedin_duplicate        — LinkedIn flagged as duplicate; user must edit
--   network_transient         — Timeout / 5xx; retry now
--   profile_missing           — User profile row not found; data integrity
--   token_decrypt_failed      — Stored token couldn't be decrypted; reconnect
--   unknown                   — Anything else; falls back to publish_error text

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS failure_category text
  CHECK (failure_category IS NULL OR failure_category IN (
    'linkedin_auth_revoked',
    'linkedin_auth_expired',
    'linkedin_rate_limited',
    'linkedin_content_rejected',
    'linkedin_content_too_long',
    'linkedin_duplicate',
    'network_transient',
    'profile_missing',
    'token_decrypt_failed',
    'unknown'
  ));

COMMENT ON COLUMN public.posts.failure_category IS
  'BP-145: Structured classification of the most recent publish failure. Populated by the publish-scheduled-posts Edge Function and the manual-publish API. NULL when the post has never failed (or for legacy past_due rows written before this column existed). Cleared on successful publish or reschedule.';

-- Partial index for the recovery page query (status=past_due ORDER BY scheduled_for).
-- Kept partial so the index stays small — only past_due rows matter for recovery.
CREATE INDEX IF NOT EXISTS posts_past_due_user_idx
  ON public.posts (user_id, scheduled_for ASC)
  WHERE status = 'past_due';
