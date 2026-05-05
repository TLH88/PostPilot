"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LinkedInConnectDialog } from "./connect-dialog";

const SESSION_FLAG = "pp_li_validated_once";
// BP-145: minimum time between focus-driven revalidations on the client side.
// The server's 1-hour throttle still applies; this just stops us from
// hammering the endpoint when the user toggles tabs every few seconds.
const FOCUS_REVALIDATE_MIN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fires `/api/linkedin/validate` on mount (once per browser session) and on
 * window focus (rate-limited client-side to once per 5 minutes; the server
 * still 1-hour-throttles real LinkedIn calls).
 *
 * BP-145: focus revalidation closes the gap where a user keeps a tab open for
 * hours, the LinkedIn token gets revoked mid-day, and they only learn about
 * it when their next scheduled post fails. Now we re-check the moment they
 * come back to the app — cheap because the server-side throttle prevents
 * actual LinkedIn calls more than once an hour.
 *
 * On a hard "revoked" or "refresh_failed" result, the endpoint has already
 * cleared the user's LinkedIn connection columns, so a router refresh makes
 * the existing LinkedInConnectionBanner surface the disconnect immediately.
 */
export function LinkedInTokenValidator() {
  const router = useRouter();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const lastFocusValidateRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function runValidation() {
      try {
        const res = await fetch("/api/linkedin/validate", { method: "POST" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as
          | { valid: true; cached?: boolean }
          | { valid: false; reason: string };

        if (!data.valid && !cancelled) {
          if (data.reason === "revoked" || data.reason === "refresh_failed") {
            toast.error(
              "LinkedIn disconnected PostPilot. Reconnect to keep scheduled posts publishing.",
              {
                duration: 10_000,
                action: {
                  label: "Reconnect",
                  onClick: () => setDialogOpen(true),
                },
              }
            );
            router.refresh();
          }
        }
      } catch {
        // Silent — validation is best-effort.
      }
    }

    // Initial fire — once per browser session.
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, "1");
      lastFocusValidateRef.current = Date.now();
      void runValidation();
    }

    // Focus-driven revalidation. Rate-limited so a tab-switching user doesn't
    // spam this; the server 1-hour-throttle is the real ceiling.
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const elapsed = Date.now() - lastFocusValidateRef.current;
      if (elapsed < FOCUS_REVALIDATE_MIN_MS) return;
      lastFocusValidateRef.current = Date.now();
      void runValidation();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return (
    <LinkedInConnectDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      reason="revoked"
      returnTo={pathname ?? undefined}
    />
  );
}
