import type { TutorialStep } from "./types";

export interface ActionDetectorOptions {
  /** The step to detect actions for */
  step: TutorialStep;
  /** Called when the required action is completed */
  onComplete: () => void;
  /** Current route path (for navigate detection) */
  currentPath?: string;
}

/** Read at runtime so admins can flip it via the Dev Tools page (BP-035 / Phase B). */
function debugEnabled(): boolean {
  return typeof window !== "undefined" && (window as { __TUTORIAL_DEBUG?: boolean }).__TUTORIAL_DEBUG === true;
}

function debugLog(...args: unknown[]) {
  if (debugEnabled()) {
    // eslint-disable-next-line no-console
    console.log("[tutorial-sdk]", ...args);
  }
}

/**
 * Sets up DOM listeners to detect when a user completes a step's required action.
 * Returns a cleanup function to remove all listeners.
 *
 * Uses a multi-strategy approach for reliability with React:
 * - Capture-phase event listeners for clicks and input
 * - Polling for input value changes (React-controlled inputs may not fire native events)
 * - MutationObserver for DOM changes (new elements appearing, class changes)
 * - Interval polling for element existence and route changes
 */
export function setupActionDetector(
  options: ActionDetectorOptions
): () => void {
  const { step, onComplete } = options;
  const action = step.action;

  if (!action || action === "manual") {
    return () => {};
  }

  const cleanups: Array<() => void> = [];
  let completed = false;
  let cleanedUp = false;

  // BP-035 / Phase A.4: Guarded cleanup is idempotent. Both complete() and the
  // returned cleanup function call this; we ensure cleanups run exactly once
  // even if both code paths fire (e.g. unmount races with action completion).
  function runCleanups() {
    if (cleanedUp) return;
    cleanedUp = true;
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // Cleanups should be best-effort; never throw out of teardown
      }
    });
  }

  function complete() {
    if (completed) return;
    completed = true;
    debugLog(`step "${step.id}" action "${action}" detected`);
    // Run all cleanups immediately
    runCleanups();
    setTimeout(onComplete, 500);
  }

  switch (action) {
    case "click": {
      const selector = step.clickTarget || step.selector;
      if (!selector) break;

      // Strategy 1: Capture-phase click listener
      function handleClick(e: Event) {
        const target = e.target as Element;
        if (target.closest(selector!)) {
          debugLog("click matched", { selector });
          complete();
        }
      }
      document.addEventListener("click", handleClick, true);
      cleanups.push(() => document.removeEventListener("click", handleClick, true));
      break;
    }

    case "navigate": {
      const targetRoute = step.waitForRoute;
      if (!targetRoute) break;

      const interval = setInterval(() => {
        // Support both exact match and prefix match (e.g., "/posts" matches "/posts/abc123")
        if (
          window.location.pathname === targetRoute ||
          window.location.pathname.startsWith(targetRoute + "/")
        ) {
          debugLog("navigate matched", { targetRoute, currentPath: window.location.pathname });
          complete();
        }
      }, 300);
      cleanups.push(() => clearInterval(interval));
      break;
    }

    case "elementExists": {
      const selector = step.waitForElement;
      if (!selector) break;

      // Strategy 1: Poll for element existence
      const interval = setInterval(() => {
        if (document.querySelector(selector)) {
          debugLog("elementExists matched", { selector });
          complete();
        }
      }, 500);
      cleanups.push(() => clearInterval(interval));

      // Strategy 2: MutationObserver for faster detection
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          debugLog("elementExists matched via mutation", { selector });
          complete();
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      cleanups.push(() => observer.disconnect());
      break;
    }

    case "formInput": {
      const selector = step.clickTarget || step.selector;
      if (!selector) break;

      // BP-035 / Phase A.3: Previously this fired complete() the moment the
      // input had ANY value, so the tutorial advanced after the user typed
      // a single letter. That made multi-line input or "type then click"
      // workflows impossible.
      //
      // Fix: require an input to (a) have non-whitespace content AND (b)
      // remain stable for FORM_INPUT_DWELL_MS — i.e. the user has paused
      // typing — before considering the step complete. We also complete
      // immediately on blur (user explicitly moved on).
      const FORM_INPUT_DWELL_MS = 1200;
      const FORM_INPUT_MIN_LENGTH = 3;

      // Helper to find the actual native input element
      function findInput(): HTMLInputElement | HTMLTextAreaElement | null {
        // Try direct selector first
        const el = document.querySelector(selector!);
        if (!el) return null;
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          return el as HTMLInputElement | HTMLTextAreaElement;
        }
        // Look inside wrapper components
        return el.querySelector("input, textarea");
      }

      let lastValue = "";
      let dwellTimer: ReturnType<typeof setTimeout> | null = null;

      function clearDwell() {
        if (dwellTimer) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      }

      function scheduleDwellComplete(value: string) {
        clearDwell();
        dwellTimer = setTimeout(() => {
          // Re-read at fire time in case the user kept typing
          const input = findInput();
          const finalValue = input?.value.trim() ?? "";
          if (finalValue.length >= FORM_INPUT_MIN_LENGTH && finalValue === value.trim()) {
            debugLog("formInput dwell completed", { selector, value: finalValue });
            complete();
          }
        }, FORM_INPUT_DWELL_MS);
      }

      function handleInputEvent(e: Event) {
        const target = e.target as HTMLInputElement | null;
        if (!target || target.value == null) return;
        const matchEl = document.querySelector(selector!);
        if (!matchEl) return;
        if (
          matchEl === target ||
          matchEl.contains(target) ||
          target.closest(selector!)
        ) {
          const trimmed = target.value.trim();
          lastValue = target.value;
          // Only schedule completion when the user has typed at least
          // FORM_INPUT_MIN_LENGTH chars — keeps the tutorial from
          // advancing on a single letter or accidental keystroke.
          if (trimmed.length >= FORM_INPUT_MIN_LENGTH) {
            scheduleDwellComplete(target.value);
          } else {
            clearDwell();
          }
        }
      }

      function handleBlur(e: Event) {
        const target = e.target as HTMLInputElement | null;
        if (!target || target.value == null) return;
        const matchEl = document.querySelector(selector!);
        if (!matchEl) return;
        if (
          matchEl === target ||
          matchEl.contains(target) ||
          target.closest(selector!)
        ) {
          const trimmed = target.value.trim();
          if (trimmed.length >= FORM_INPUT_MIN_LENGTH) {
            debugLog("formInput completed via blur", { selector, value: trimmed });
            complete();
          }
        }
      }

      for (const evt of ["input", "change", "keyup"]) {
        document.addEventListener(evt, handleInputEvent, true);
        cleanups.push(() => document.removeEventListener(evt, handleInputEvent, true));
      }
      document.addEventListener("blur", handleBlur, true);
      cleanups.push(() => document.removeEventListener("blur", handleBlur, true));

      // Polling fallback for React-controlled inputs whose change events
      // sometimes don't fire as expected. Same dwell rules apply.
      const pollInterval = setInterval(() => {
        const input = findInput();
        if (!input) {
          debugLog("formInput poll — input not found", { selector });
          return;
        }
        const value = input.value;
        const trimmed = value.trim();
        debugLog("formInput poll", { selector, value, trimmedLen: trimmed.length, lastValue });
        if (trimmed.length >= FORM_INPUT_MIN_LENGTH && value !== lastValue) {
          lastValue = value;
          scheduleDwellComplete(value);
        }
      }, 300);
      cleanups.push(() => clearInterval(pollInterval));
      cleanups.push(clearDwell);
      break;
    }
  }

  return () => {
    completed = true;
    runCleanups();
  };
}
