-- Theme preference column on user_profiles.
--
-- Owner direction 2026-05-04: theme choice should persist cross-device.
-- Persists the user's selected theme so signing in on a new browser
-- restores their preference instead of falling back to the dark default.
-- Nullable (column null = no explicit choice → use the app default,
-- currently "dark"). Constrained to the three values next-themes uses.
--
-- Already applied to prod via Supabase MCP on 2026-05-04 — this file is
-- the in-repo record.

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS theme_preference text
CHECK (theme_preference IS NULL OR theme_preference IN ('light', 'dark', 'system'));
