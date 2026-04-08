-- Track when the user performed the scheduling action (distinct from scheduled_for which is the publish time)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
