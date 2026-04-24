-- BP-131: FK cascade fixes uncovered during the account-deletion audit.
--
-- 1. workspaces.owner_id was ON DELETE CASCADE — meaning deleting the
--    owner's auth.users row would silently nuke the entire workspace
--    and every member's data. Wrong; deletion must be blocked until
--    ownership is explicitly transferred (RESTRICT). Pre-flight checks
--    in /api/admin/users + /api/account surface the problem clearly.
--
-- 2. workspace_members.invited_by had no ON DELETE clause (defaulted
--    to NO ACTION = RESTRICT) — meaning deleting a user who has ever
--    invited someone fails at the FK layer. Switching to SET NULL
--    preserves the historical row while letting the deletion proceed.

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey,
  ADD CONSTRAINT workspaces_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_invited_by_fkey,
  ADD CONSTRAINT workspace_members_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT workspaces_owner_id_fkey ON public.workspaces IS
  'BP-131: RESTRICT prevents accidental nuking of an entire workspace via owner deletion. Owner must transfer ownership first.';

COMMENT ON CONSTRAINT workspace_members_invited_by_fkey ON public.workspace_members IS
  'BP-131: SET NULL preserves the historical membership row when the inviting user is deleted. Without this clause the deletion would be blocked.';
