-- BP-023/024: Workspaces and Team Onboarding

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text,
  brand_uvp text,
  brand_industry text,
  brand_product_or_service text,
  brand_target_audience text,
  brand_demographics text,
  brand_voice_guidelines text,
  brand_content_pillars text[] DEFAULT '{}',
  linkedin_account_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- 2. Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. Add workspace_id to existing tables
ALTER TABLE posts ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);
ALTER TABLE content_library ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);
ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);

-- 4. Add 'team' to subscription_tier check constraint
ALTER TABLE creator_profiles DROP CONSTRAINT IF EXISTS creator_profiles_subscription_tier_check;
ALTER TABLE creator_profiles ADD CONSTRAINT creator_profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'creator', 'professional', 'team', 'enterprise'));

-- 5. RLS policies for workspaces
CREATE POLICY "Workspace members can read workspace"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid())
  );

CREATE POLICY "Workspace owner can update workspace"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 6. RLS policies for workspace_members
CREATE POLICY "Members can read their workspace members"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Workspace owner can manage members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.owner_id = auth.uid())
    OR auth.uid() = user_id
  );

CREATE POLICY "Workspace owner can remove members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.owner_id = auth.uid())
  );

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_workspace ON posts (workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_workspace ON ideas (workspace_id) WHERE workspace_id IS NOT NULL;
