-- BP-117 Phase A: add image_generations_used quota counter
--
-- Subscription Model v2 introduces a per-tier monthly cap on AI image
-- generations (Personal 30, Pro 200, Team/Enterprise unlimited). We were
-- already tracking posts_created / brainstorms_used / chat_messages_used /
-- scheduled_posts on usage_quotas; image_generations_used is the missing
-- column.
--
-- Additive, NOT NULL with default 0 — existing rows backfill cleanly and no
-- existing quota-enforcement code breaks. Actual enforcement wiring lands in
-- BP-117 Phase B.

ALTER TABLE usage_quotas
  ADD COLUMN IF NOT EXISTS image_generations_used INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN usage_quotas.image_generations_used IS
  'Monthly count of AI image generations the user has consumed against their tier quota. Reset each billing period along with sibling counters.';
