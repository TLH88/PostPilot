-- BP-025: LinkedIn API Analytics prep
-- Track when analytics were last fetched from LinkedIn API
ALTER TABLE posts ADD COLUMN IF NOT EXISTS analytics_fetched_at timestamptz;

-- Track which OAuth scopes were granted during LinkedIn connection
-- Lets us know if r_member_social is available without making an API call
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS linkedin_scopes text[];
