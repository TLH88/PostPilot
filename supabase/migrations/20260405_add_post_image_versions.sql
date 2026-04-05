-- Image versioning: store every generated/uploaded image as a version
CREATE TABLE post_image_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  image_url text NOT NULL,
  prompt text,
  source text NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_image_versions_post_id ON post_image_versions(post_id);
CREATE INDEX idx_post_image_versions_user_id ON post_image_versions(user_id);

ALTER TABLE post_image_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own image versions"
  ON post_image_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own image versions"
  ON post_image_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own image versions"
  ON post_image_versions FOR DELETE
  USING (auth.uid() = user_id);
