"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Persistent banner shown across all pages when LinkedIn posting is disconnected.
 * Auto-checks status on mount and after returning from the connect flow.
 * Cannot be dismissed — only disappears when reconnected.
 */
export function LinkedInStatusBanner() {
  const [disconnected, setDisconnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const pathname = usePathname();

  // Don't show on onboarding, settings, or admin pages
  const isExcludedPage = pathname?.startsWith("/onboarding") || pathname?.startsWith("/admin");

  useEffect(() => {
    if (isExcludedPage) {
      setChecking(false);
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch("/api/linkedin/status");
        if (!res.ok) {
          setDisconnected(true);
          return;
        }
        const data = await res.json();
        // Connected if we have a valid, non-expired connection
        setDisconnected(!data.connected && !data.expired ? true : data.expired === true);
        // If connected and not expired, no banner needed
        if (data.connected && !data.expired) {
          setDisconnected(false);
        }
      } catch {
        // Network error — don't show banner (could be transient)
        setDisconnected(false);
      } finally {
        setChecking(false);
      }
    }

    checkStatus();
  }, [pathname, isExcludedPage]);

  // Auto-connect: on very first visit (no LinkedIn ever connected), redirect to connect
  useEffect(() => {
    if (isExcludedPage || checking) return;

    async function autoConnect() {
      try {
        const res = await fetch("/api/linkedin/status");
        if (!res.ok) return;
        const data = await res.json();
        // Only auto-redirect if never connected (no connected_at) and this is the dashboard (first page after login)
        if (!data.connected && !data.connected_at && pathname === "/dashboard") {
          const hasAutoConnected = sessionStorage.getItem("linkedin_auto_connect_attempted");
          if (!hasAutoConnected) {
            sessionStorage.setItem("linkedin_auto_connect_attempted", "true");
            window.location.href = "/api/linkedin/connect";
          }
        }
      } catch {
        // Ignore
      }
    }

    autoConnect();
  }, [checking, pathname, isExcludedPage]);

  if (checking || !disconnected || isExcludedPage) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 mb-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <AlertTriangle className="size-4 shrink-0" />
        <span>LinkedIn posting is disconnected. Reconnect to publish posts directly.</span>
      </div>
      <button
        type="button"
        disabled={connecting}
        onClick={() => {
          setConnecting(true);
          window.location.href = "/api/linkedin/connect";
        }}
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connecting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Connecting...
          </>
        ) : (
          "Reconnect Now"
        )}
      </button>
    </div>
  );
}
