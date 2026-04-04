-- Convert content_pillar (single text) to content_pillars (text array) on posts and ideas
-- This enables many-to-one relationship between pillars and posts

-- Posts: add new array column, migrate data, drop old column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_pillars text[] DEFAULT '{}';
UPDATE posts SET content_pillars = ARRAY[content_pillar] WHERE content_pillar IS NOT NULL;
ALTER TABLE posts DROP COLUMN IF EXISTS content_pillar;

-- Ideas: add new array column, migrate data, drop old column
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS content_pillars text[] DEFAULT '{}';
UPDATE ideas SET content_pillars = ARRAY[content_pillar] WHERE content_pillar IS NOT NULL;
ALTER TABLE ideas DROP COLUMN IF EXISTS content_pillar;

-- Content Library: add new array column, migrate data, drop old column
ALTER TABLE content_library ADD COLUMN IF NOT EXISTS content_pillars text[] DEFAULT '{}';
UPDATE content_library SET content_pillars = ARRAY[content_pillar] WHERE content_pillar IS NOT NULL;
ALTER TABLE content_library DROP COLUMN IF EXISTS content_pillar;

-- Post Templates: add new array column, migrate data, drop old column
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS content_pillars text[] DEFAULT '{}';
UPDATE post_templates SET content_pillars = ARRAY[content_pillar] WHERE content_pillar IS NOT NULL;
ALTER TABLE post_templates DROP COLUMN IF EXISTS content_pillar;
