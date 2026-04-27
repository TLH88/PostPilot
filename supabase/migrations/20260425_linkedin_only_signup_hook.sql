-- BP-129: Before User Created Auth Hook — enforce LinkedIn-OIDC-only signup.
--
-- Closes the residual gap accepted in BP-131 where the Email provider must
-- stay enabled for admin.generateLink (E2E magic-links) to work, even though
-- our app UI exposes only LinkedIn OAuth.
--
-- This hook fires before Supabase Auth creates a new user. Returning
-- jsonb '{}' allows the signup; returning {"error": {...}} blocks it.
--
-- Allow conditions (any one is sufficient):
--   1. provider = 'linkedin_oidc' — the intended public flow
--   2. user_metadata contains 'e2e_tier' — E2E fixture seeded by
--      scripts/e2e/seed-test-users.ts via service role. Keeps the
--      test suite running without weakening the production gate.
--
-- Anything else (notably provider='email' from a public signInWithOtp
-- call) is rejected with a 403 + actionable message.
--
-- Note: admin.createUser via service role does NOT route through Auth
-- Hooks — those calls bypass the hook entirely. The e2e_tier escape
-- hatch is therefore belt-and-suspenders, not strictly required.
--
-- Setup (one-time, owner action after this migration applies):
--   Supabase dashboard → Authentication → Hooks → Before User Created Hook
--   → select function public.hook_linkedin_only_signup → save.
-- This migration cannot enable the hook itself; that wiring is dashboard-only.

CREATE OR REPLACE FUNCTION public.hook_linkedin_only_signup(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_provider text;
  v_user_meta jsonb;
BEGIN
  v_provider := event->'user'->'app_metadata'->>'provider';
  v_user_meta := event->'user'->'user_metadata';

  -- Allow LinkedIn OIDC — the intended public flow.
  IF v_provider = 'linkedin_oidc' THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Allow E2E fixtures (seeded by service role with e2e_tier metadata).
  -- The admin API typically bypasses Auth Hooks anyway, but this is a
  -- safety net in case any seeder path routes through them.
  IF v_user_meta ? 'e2e_tier' THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Reject everything else.
  RETURN jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message',
      format(
        'Signups are restricted to LinkedIn OAuth. Provider "%s" is not permitted.',
        COALESCE(v_provider, 'unknown')
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.hook_linkedin_only_signup(jsonb) IS
  'BP-129: Before User Created Hook. Allows linkedin_oidc + E2E fixtures (e2e_tier in user_metadata); rejects everything else with HTTP 403.';

-- Permissions: hook callers run as supabase_auth_admin. Other roles
-- have no business invoking this directly.
GRANT EXECUTE ON FUNCTION public.hook_linkedin_only_signup(jsonb)
  TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.hook_linkedin_only_signup(jsonb)
  FROM authenticated, anon, public;
