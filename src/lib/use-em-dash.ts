"use client";

/**
 * Client-side em-dash preference hook + sync reader.
 *
 * Stored in localStorage per device (default = allowed). The flag rides
 * on every AI request body; the server appends a one-line suppression
 * rule to the system prompt when allowed=false (see `buildEmDashRule`
 * in `./em-dash.ts`).
 */

import { useCallback, useEffect, useState } from "react";
import { EM_DASH_STORAGE_KEY } from "./em-dash";

/** Sync read for use inside async fetch builders. SSR-safe (returns true). */
export function getEmDashAllowedSync(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(EM_DASH_STORAGE_KEY);
    if (raw === "0") return false;
    return true; // null / "1" / anything else
  } catch {
    return true;
  }
}

/** React hook — returns [allowed, setAllowed]. Persists to localStorage. */
export function useEmDashAllowed(): [boolean, (next: boolean) => void] {
  const [allowed, setAllowedState] = useState<boolean>(true);

  // Hydrate after mount to avoid SSR/client mismatch.
  useEffect(() => {
    setAllowedState(getEmDashAllowedSync());
  }, []);

  const setAllowed = useCallback((next: boolean) => {
    setAllowedState(next);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(EM_DASH_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* swallow quota / private mode */
    }
  }, []);

  return [allowed, setAllowed];
}
