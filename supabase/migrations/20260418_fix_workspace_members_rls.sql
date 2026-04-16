-- Fix workspace_members RLS: previous SELECT policy only showed the user their own row,
-- preventing them from seeing fellow workspace members. Required for role management UI,
-- reviewer selection dropdown, assignment dropdowns, and mention autocomplete.

-- Helper function: check if a user is a member of a workspace (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = uid
  );
$$;

-- Helper function: get user's role in a workspace
CREATE OR REPLACE FUNCTION get_workspace_role(ws_id uuid, uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = ws_id AND user_id = uid
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION is_workspace_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_role(uuid, uuid) TO authenticated;

-- SELECT: all workspace members can see each other
DROP POLICY IF EXISTS "Members can read their workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Members can read fellow workspace members" ON workspace_members;
CREATE POLICY "Members can read fellow workspace members" ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

-- UPDATE: owner/admin can update any member
DROP POLICY IF EXISTS "Workspace owner/admin can update members" ON workspace_members;
CREATE POLICY "Workspace owner/admin can update members" ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
    OR get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- DELETE: owner/admin can remove members, members can leave themselves
DROP POLICY IF EXISTS "Workspace owner can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Owner or admin can remove members" ON workspace_members;
CREATE POLICY "Owner or admin can remove members" ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
    OR get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );
