-- BP-099: Focus View — add ui_mode column to user_profiles
--
-- ui_mode determines which home screen the user sees on login:
--   'focus'    — simplified launcher with four primary action cards
--   'standard' — the existing full dashboard
--
-- Behavior at rollout:
--   - All EXISTING rows get backfilled to 'standard' so current users
--     see no change without their consent.
--   - The column DEFAULT is 'focus' so NEW rows created AFTER this
--     migration land on Focus View by default. The dedicated onboarding
--     step (Phase 3) overwrites this with the user's explicit choice.
--   - BP-142 will enforce that ui_mode is non-null at login (it's
--     declared NOT NULL here, so the gate's job is just confirming the
--     onboarding step was completed when other required fields might
--     also be missing).
--
-- Mobile users have a fixed mobile UI regardless of ui_mode (mobile
-- detection happens in the layout, not here). This column applies only
-- to desktop sessions.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ui_mode text NOT NULL DEFAULT 'focus'
  CHECK (ui_mode IN ('focus', 'standard'));

-- Backfill: every row that existed BEFORE this migration ran is an
-- established user. They keep the standard dashboard so their day-to-day
-- experience does not change without consent.
UPDATE public.user_profiles
SET ui_mode = 'standard'
WHERE ui_mode = 'focus'  -- catches rows that just got the default
  AND created_at < NOW();

COMMENT ON COLUMN public.user_profiles.ui_mode IS
  'BP-099: home-screen mode — ''focus'' = Focus View launcher, ''standard'' = full dashboard. Chosen during onboarding; toggleable in Settings → Appearance and via the top-bar view toggle. Mobile users get a fixed mobile UI regardless of this value.';
