"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function TrialExpiryChecker() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    async function check() {
      try {
        const res = await fetch("/api/trial/check-expiry", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();

        if (data.expired) {
          toast.info(
            `Your ${data.expired_trial?.charAt(0).toUpperCase()}${data.expired_trial?.slice(1)} trial has ended. You've been moved back to the ${data.reverted_to?.charAt(0).toUpperCase()}${data.reverted_to?.slice(1)} plan.`,
            { duration: 8000 }
          );
        } else if (data.account_status === "trial" && data.days_left != null && data.days_left <= 3) {
          toast.info(
            `Your ${data.trial_tier?.charAt(0).toUpperCase()}${data.trial_tier?.slice(1)} trial ends in ${data.days_left} day${data.days_left !== 1 ? "s" : ""}. Upgrade to keep your features.`,
            { duration: 6000 }
          );
        }
      } catch {
        // Silent fail — trial check is non-critical
      }
    }

    check();
  }, []);

  return null;
}
