/**
 * Dev / debug flags registry — admin-only diagnostic toggles.
 *
 * BP-035 / Phase B
 *
 * Why this exists:
 *   We sometimes need to enable verbose diagnostic logging to investigate
 *   user-reported bugs (e.g. "the tutorial doesn't advance"). Rather than
 *   asking admins to remember `window.__SOMETHING__ = true` console
 *   incantations, we expose a single admin page (/admin/dev-tools) that
 *   surfaces every available diagnostic flag with: title, description,
 *   default state, and a "when to use" note.
 *
 * How it works:
 *   - Each flag has a stable `id` and a corresponding `windowVar` set on
 *     `window` (e.g. `__TUTORIAL_DEBUG`).
 *   - Admin toggle states are persisted in localStorage under
 *     LOCAL_STORAGE_KEY as a JSON object: { [flagId]: boolean }.
 *   - DevFlagsApplier (mounted in the app layout) reads localStorage on
 *     mount and writes the flags to `window`. On flag changes, it re-applies.
 *   - Flags are browser-only side-channels for logging. They never gate
 *     functionality and never affect server behavior.
 *
 * Adding a new flag:
 *   1. Append a new entry to DEV_FLAGS below.
 *   2. Read the flag in your code via `if ((window as any).__YOUR_VAR === true)`.
 *   3. The /admin/dev-tools page will pick it up automatically.
 */

export interface DevFlag {
  /** Stable identifier — used as the localStorage key suffix */
  id: string;
  /** The `window.<varName>` global that consumer code reads */
  windowVar: string;
  /** User-friendly title shown in the admin UI */
  name: string;
  /** Plain-language description of what the flag does */
  description: string;
  /**
   * Intended default state — purely informational for the admin.
   * The runtime default is always OFF (we never auto-enable diagnostics).
   */
  defaultState: boolean;
  /** When an admin should turn this flag on */
  whenToUse: string;
  /** Where the flag takes effect */
  appliesTo: "Browser only" | "Server only" | "Browser + Server";
}

export const LOCAL_STORAGE_KEY = "postpilot_dev_flags";

export const DEV_FLAGS: readonly DevFlag[] = [
  {
    id: "tutorial_debug",
    windowVar: "__TUTORIAL_DEBUG",
    name: "Tutorial SDK debug logging",
    description:
      "Logs every action-detector poll, navigation event, click match, formInput dwell, and step transition to the browser console. Verbose — expect dozens of lines per second while a tutorial is active.",
    defaultState: false,
    whenToUse:
      "When a user (or you) reports the tutorial behaving oddly: skipping steps, not advancing on user action, highlighting the wrong element, or auto-closing unexpectedly. Turn on, reproduce the issue, copy the console output, then turn off.",
    appliesTo: "Browser only",
  },
  // Add new flags here as needed. They'll appear automatically in /admin/dev-tools.
] as const;

// ── Storage helpers (browser-only) ───────────────────────────────────────────

/**
 * Read the saved flag map from localStorage.
 * Safe to call during SSR — returns an empty object on the server.
 */
export function readDevFlags(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

/**
 * Write the flag map to localStorage and apply each flag to `window` immediately.
 * No-op on the server.
 */
export function writeDevFlags(flags: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // localStorage may be unavailable in some browser modes — silently fail
  }
  applyDevFlagsToWindow(flags);
}

/**
 * Apply the flag map to `window` globals so consumer code can read them.
 * Looks up each flag's `windowVar` in DEV_FLAGS and writes a boolean.
 */
export function applyDevFlagsToWindow(flags: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as Record<string, boolean>;
  for (const flag of DEV_FLAGS) {
    win[flag.windowVar] = flags[flag.id] === true;
  }
}
