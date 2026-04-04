-- BP-016: Usage Quota System
-- Run this migration in Supabase SQL Editor

-- 1. Add subscription tier to creator_profiles
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
CHECK (subscription_tier IN ('free', 'creator', 'professional'));

-- 2. Create usage_quotas table
CREATE TABLE IF NOT EXISTS usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  posts_created integer NOT NULL DEFAULT 0,
  brainstorms_used integer NOT NULL DEFAULT 0,
  chat_messages_used integer NOT NULL DEFAULT 0,
  scheduled_posts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

-- 3. Enable RLS
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies: users can only access their own quotas
CREATE POLICY "Users can read own quotas"
  ON usage_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotas"
  ON usage_quotas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotas"
  ON usage_quotas FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_quotas_user_period
  ON usage_quotas (user_id, period_start);
