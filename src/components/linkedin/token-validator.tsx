"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SESSION_FLAG = "pp_li_validated_once";

/**
 * Fires a single `/api/linkedin/validate` call per browser session on mount.
 *
 * The server throttles real LinkedIn API calls to at most one per hour, so
 * this is cheap even across multiple tabs. The purpose is to catch revoked
 * tokens (which LinkedIn never notifies us about) before the user's next
 * scheduled post silently fails.
 *
 * On a hard "revoked" or "refresh_failed" result, the endpoint has already
 * cleared the user's LinkedIn connection columns, so a router refresh makes
 * the existing LinkedInConnectionBanner surface the disconnect immediately.
 * We also show a toast with a direct reconnect action.
 */
export function LinkedInTokenValidator() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, "1");

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/linkedin/validate", { method: "POST" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as
          | { valid: true; cached?: boolean }
          | { valid: false; reason: string };

        if (!data.valid && !cancelled) {
          // "not_connected" / "no_token" aren't surprises — the user never
          // connected (or already knows). Don't nag them.
          if (data.reason === "revoked" || data.reason === "refresh_failed") {
            toast.error(
              "LinkedIn disconnected PostPilot. Reconnect to keep scheduled posts publishing.",
              {
                duration: 10_000,
                action: {
                  label: "Reconnect",
                  onClick: () => {
                    window.location.href = "/api/linkedin/connect";
                  },
                },
              }
            );
            router.refresh();
          }
        }
      } catch {
        // Silent — validation is best-effort.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
