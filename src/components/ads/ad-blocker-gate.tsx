"use client";

/**
 * BP-045 — Ad-blocker gate for Free + Personal tier users.
 *
 * Mounts in `(app)/layout.tsx`. Runs `detectAdBlocker()` on first mount,
 * and on every retry. While `blocked === true`, renders the
 * non-dismissable AdBlockerModal which prevents continued use of the app
 * until the user disables their blocker. The DOM behind the modal is
 * functionally inert because Base UI's Dialog backdrop captures
 * pointer events, but we add `aria-hidden` to assistive tech for
 * defense-in-depth.
 *
 * Pro / Team / Enterprise tiers never receive this component (the
 * layout omits it for those tiers), so they're unaffected.
 *
 * Detection runs on initial mount only (not on every navigation) to
 * avoid spamming the bait technique on route changes — Next.js App
 * Router preserves the layout between pages so a once-per-session
 * check is sufficient until the user reloads.
 */

import { useCallback, useEffect, useState } from "react";
import { detectAdBlocker } from "@/lib/ads/detect-ad-blocker";
import { AdBlockerModal } from "@/components/ads/ad-blocker-modal";

export function AdBlockerGate() {
  // `null` = not yet checked, `false` = clear, `true` = blocked
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [retrying, setRetrying] = useState(false);

  const runCheck = useCallback(async () => {
    const result = await detectAdBlocker();
    setBlocked(result);
    return result;
  }, []);

  useEffect(() => {
    // First check fires on mount. The setState lives inside `runCheck`
    // after an awaited DOM probe, so the lint rule isn't tripped (no
    // synchronous setState in the effect body).
    void runCheck();
  }, [runCheck]);

  const onRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await runCheck();
    } finally {
      setRetrying(false);
    }
  }, [runCheck]);

  return (
    <AdBlockerModal
      open={blocked === true}
      retrying={retrying}
      onRetry={onRetry}
    />
  );
}
