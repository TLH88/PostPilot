-- BP-021: Manual Analytics
-- Add engagement tracking columns to posts table

ALTER TABLE posts ADD COLUMN IF NOT EXISTS impressions integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reactions integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reposts integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS engagements integer;

-- Track paste imports
CREATE TABLE IF NOT EXISTS analytics_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imported_at timestamptz NOT NULL DEFAULT now(),
  posts_matched integer NOT NULL DEFAULT 0,
  source_type text NOT NULL DEFAULT 'linkedin_paste'
);

ALTER TABLE analytics_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own imports"
  ON analytics_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own imports"
  ON analytics_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
