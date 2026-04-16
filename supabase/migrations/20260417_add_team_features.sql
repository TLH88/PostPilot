-- Team features: assignments, comments, activity, notifications, approvals (BP-023, BP-046-051)

-- BP-023: Brand/Team onboarding — workspace type + extended brand profile
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS workspace_type text
  NOT NULL DEFAULT 'individual'
  CHECK (workspace_type IN ('individual', 'brand'));
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS brand_sample_posts jsonb DEFAULT '[]';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS approval_stages jsonb DEFAULT '[]';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- BP-046: Post assignment
ALTER TABLE posts ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- BP-050: Approval workflow — extend posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS approval_stage text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS approval_status text
  CHECK (approval_status IN ('pending', 'approved', 'changes_requested', null));

CREATE INDEX IF NOT EXISTS posts_assigned_to_idx ON posts (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_workspace_status_idx ON posts (workspace_id, status) WHERE workspace_id IS NOT NULL;

-- BP-047: Post comments (threaded, with mentions + resolve)
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_comments_post_idx ON post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON post_comments (parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read comments on accessible posts" ON post_comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND (p.user_id = auth.uid() OR p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))
  );
CREATE POLICY "Users write comments on accessible posts" ON post_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND (p.user_id = auth.uid() OR p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))
  );
CREATE POLICY "Users update own comments" ON post_comments FOR UPDATE
  USING (user_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = post_comments.workspace_id AND role IN ('owner', 'admin')));
CREATE POLICY "Users delete own comments" ON post_comments FOR DELETE
  USING (user_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = post_comments.workspace_id AND role IN ('owner', 'admin')));

-- BP-048: Activity log (workspace-wide feed + per-post timeline)
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  action text NOT NULL,
  -- Actions: created, edited, commented, assigned, unassigned, status_changed,
  -- submitted_for_review, approved, changes_requested, published, scheduled, archived
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_workspace_idx ON activity_log (workspace_id, created_at DESC) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_log_post_idx ON activity_log (post_id, created_at DESC) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log (user_id, created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read workspace activity" ON activity_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Users write own activity" ON activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- BP-049: Notifications center
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  -- Types: assignment, mention, comment, approval_request, approval_decision,
  -- deadline, post_published, post_failed, trial_ending, trial_ended
  title text NOT NULL,
  body text,
  action_url text,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  -- Email delivery prep (not sent yet — requires email provider)
  email_enabled boolean NOT NULL DEFAULT true,
  email_sent_at timestamptz,
  email_queued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- BP-050: Approval history (each decision in an approval workflow)
CREATE TABLE IF NOT EXISTS post_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  stage text NOT NULL,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
  feedback text,
  version_id uuid REFERENCES post_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_approvals_post_idx ON post_approvals (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_approvals_reviewer_idx ON post_approvals (reviewer_id, created_at DESC);

ALTER TABLE post_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members read approvals" ON post_approvals FOR SELECT
  USING (
    reviewer_id = auth.uid()
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Reviewers create approvals" ON post_approvals FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());
