-- BP-113: Server-side RLS gating for content_library built-in rows
--
-- PROBLEM
-- content_library holds built-in hooks/CTAs/closings/snippets
-- (is_builtin = true) plus user-owned rows. Built-ins are currently
-- readable by any authenticated user via the table's existing SELECT
-- policy. A client-side gate hides the Library UI for Free / Personal
-- users, but a direct REST call from DevTools still returns built-in
-- rows. Per Subscription Model v2 (BP-117), Library access is
-- Professional / Team / Enterprise only.
--
-- FIX (defense in depth — client gates stay in place)
-- Replace the permissive SELECT policy on content_library with one that:
--   1. Always returns rows the user owns (user_id = auth.uid()), so a
--      downgrade never orphans saved content.
--   2. Returns is_builtin = true rows only when the caller's
--      user_profiles.subscription_tier is in the Library-enabled set
--      ('professional', 'team', 'enterprise').
--
-- Not touched: INSERT / UPDATE / DELETE policies. Built-ins are seeded
-- server-side; users cannot create them. Existing write policies (which
-- scope by user_id = auth.uid()) already prevent tampering.

-- ---------------------------------------------------------------------
-- 1. Helper: has_library_access(uid)
-- ---------------------------------------------------------------------
-- SECURITY DEFINER so the policy can read user_profiles without the
-- caller needing a SELECT policy on that table for the tier column.
-- STABLE + search_path locked down per Supabase SECURITY DEFINER guidance.
CREATE OR REPLACE FUNCTION public.has_library_access(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = uid
      AND up.subscription_tier IN ('professional', 'team', 'enterprise')
  );
$$;

-- Callable by the Supabase auth roles that RLS evaluates against.
REVOKE ALL ON FUNCTION public.has_library_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_library_access(uuid) TO authenticated;

COMMENT ON FUNCTION public.has_library_access(uuid) IS
  'BP-113: true when the user''s subscription_tier grants content_library access (Professional+). Mirrors GATED_FEATURES.content_library in src/lib/constants.ts.';

-- ---------------------------------------------------------------------
-- 2. Drop the pre-existing permissive SELECT policy on content_library
-- ---------------------------------------------------------------------
-- Confirmed via pg_policies 2026-04-25: the actual policyname is
-- "Users see own + builtin library items" with USING clause
--   ((auth.uid() = user_id) OR (is_builtin = true)).
-- That is the permissive ungated policy we are replacing. Other
-- plausible names are dropped IF EXISTS as defense against drift.
DROP POLICY IF EXISTS "Users see own + builtin library items" ON public.content_library;
DROP POLICY IF EXISTS "content_library_select"              ON public.content_library;
DROP POLICY IF EXISTS "content_library_select_policy"       ON public.content_library;
DROP POLICY IF EXISTS "Users can view their own and builtin library items"
                                                            ON public.content_library;
DROP POLICY IF EXISTS "Users can read own or builtin library items"
                                                            ON public.content_library;
DROP POLICY IF EXISTS "Enable read access for users"        ON public.content_library;
DROP POLICY IF EXISTS "select_content_library"              ON public.content_library;

-- Make sure RLS is still enforced after the drop.
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. New SELECT policy
-- ---------------------------------------------------------------------
CREATE POLICY "content_library_select_tier_gated"
ON public.content_library
FOR SELECT
TO authenticated
USING (
  -- Always: user's own rows (downgrade-safe).
  user_id = auth.uid()
  -- Plus: built-ins, only if the user's tier grants Library access.
  OR (is_builtin = true AND public.has_library_access(auth.uid()))
);

COMMENT ON POLICY "content_library_select_tier_gated" ON public.content_library IS
  'BP-113: user-owned rows always visible; is_builtin rows only for Professional/Team/Enterprise.';
