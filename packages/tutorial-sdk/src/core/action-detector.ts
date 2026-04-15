import type { TutorialStep } from "./types";

export interface ActionDetectorOptions {
  /** The step to detect actions for */
  step: TutorialStep;
  /** Called when the required action is completed */
  onComplete: () => void;
  /** Current route path (for navigate detection) */
  currentPath?: string;
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

  function complete() {
    if (completed) return;
    completed = true;
    // Run all cleanups immediately
    cleanups.forEach((fn) => fn());
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
          complete();
        }
      }, 500);
      cleanups.push(() => clearInterval(interval));

      // Strategy 2: MutationObserver for faster detection
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
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

      // Strategy 1: Capture-phase listeners for input, change, and keyup
      // (keyup is the most reliable for React-controlled inputs)
      function handleInputEvent(e: Event) {
        const target = e.target as HTMLInputElement | null;
        if (!target || !target.value) return;
        // Check by ID match, containment, or closest
        const matchEl = document.querySelector(selector!);
        if (!matchEl) return;
        if (
          matchEl === target ||
          matchEl.contains(target) ||
          target.closest(selector!)
        ) {
          if (target.value.trim().length > 0) {
            complete();
          }
        }
      }
      for (const evt of ["input", "change", "keyup"]) {
        document.addEventListener(evt, handleInputEvent, true);
        cleanups.push(() => document.removeEventListener(evt, handleInputEvent, true));
      }

      // Strategy 2: Poll the input value every 300ms
      // This is the most reliable fallback for React-controlled inputs
      const pollInterval = setInterval(() => {
        const el = document.querySelector(selector!);
        const input = findInput();
        if (typeof window !== "undefined" && (window as any).__TUTORIAL_DEBUG) {
          console.log("[tutorial-sdk] formInput poll:", {
            selector,
            elFound: !!el,
            elTag: el?.tagName,
            inputFound: !!input,
            inputTag: input?.tagName,
            value: input?.value,
          });
        }
        if (input && input.value.trim().length > 0) {
          complete();
        }
      }, 300);
      cleanups.push(() => clearInterval(pollInterval));
      break;
    }
  }

  return () => {
    completed = true;
    cleanups.forEach((fn) => fn());
  };
}
