"use client";

/**
 * Cross-device theme persistence bridge.
 *
 * Owner direction 2026-05-04: a user's theme choice should follow them
 * across devices and browsers, not just stick in one localStorage. This
 * component runs in `(app)/layout.tsx` and bridges the two sides:
 *
 *   1. On mount, if the DB has a saved theme that differs from the current
 *      next-themes value (which next-themes hydrated from localStorage),
 *      apply the DB value via `setTheme()`. The DB is the cross-device
 *      source of truth.
 *   2. When the user changes the theme (top-bar toggle, onboarding
 *      picker), the `theme` value from `useTheme()` updates. We POST it
 *      to `/api/settings/theme` so the new choice persists in the DB.
 *
 * Tradeoff: brief flash possible on a fresh browser if localStorage and
 * DB disagree. Acceptable for a one-time-per-browser quirk; subsequent
 * loads on the same browser have localStorage in sync with the DB.
 *
 * `lastSavedRef` tracks the most recently DB-synced value so the
 * apply-from-DB step doesn't immediately re-POST the same value back.
 */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface ThemePersistenceProps {
  /** Current value of `user_profiles.theme_preference`. Null = no explicit choice. */
  initialTheme: string | null;
}

export function ThemePersistence({ initialTheme }: ThemePersistenceProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Tracks the most-recent value either applied-from-DB or POSTed-to-DB.
  // Prevents the apply step from triggering an immediate re-save loop.
  const lastSavedRef = useRef<string | null>(initialTheme);
  // Once the apply-from-DB step has run (whether it applied or not), the
  // sync-to-DB effect is allowed to fire on subsequent theme changes.
  const appliedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Apply DB theme on first post-hydration render.
  useEffect(() => {
    if (!mounted || appliedRef.current) return;
    appliedRef.current = true;
    if (initialTheme && initialTheme !== theme) {
      setTheme(initialTheme);
      lastSavedRef.current = initialTheme;
    }
  }, [mounted, initialTheme, theme, setTheme]);

  // Sync user-driven theme changes back to the DB.
  useEffect(() => {
    if (!appliedRef.current) return;
    if (!theme) return;
    if (theme === lastSavedRef.current) return;
    lastSavedRef.current = theme;
    void fetch("/api/settings/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch((err) => {
      // Best-effort — UI already applied the theme. Log and move on.
      console.warn("[theme-persistence] failed to save theme:", err);
    });
  }, [theme]);

  return null;
}
