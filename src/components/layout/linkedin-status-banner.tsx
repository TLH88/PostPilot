"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  LinkedInConnectDialog,
  type LinkedInConnectReason,
} from "@/components/linkedin/connect-dialog";

/**
 * Persistent banner shown across all pages when LinkedIn posting is disconnected.
 * Auto-checks status on mount and after returning from the connect flow.
 * Cannot be dismissed — only disappears when reconnected.
 *
 * BP-136: Both manual ("Reconnect Now") and first-visit auto-connect paths now
 * open the LinkedInConnectDialog interstitial instead of redirecting directly,
 * so the user understands they're being sent to LinkedIn on purpose and their
 * PostPilot session stays active.
 */
export function LinkedInStatusBanner() {
  const [disconnected, setDisconnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReason, setDialogReason] = useState<LinkedInConnectReason>("reconnect");
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

  // Auto-prompt: on very first visit (no LinkedIn ever connected), open the
  // connect dialog so the user can decide to continue. Previously did a hard
  // redirect that felt like a logout — see BP-136 / UF-002b.
  useEffect(() => {
    if (isExcludedPage || checking) return;

    async function autoPromptConnect() {
      try {
        const res = await fetch("/api/linkedin/status");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.connected && !data.connected_at && pathname === "/dashboard") {
          const hasPrompted = sessionStorage.getItem("linkedin_auto_connect_attempted");
          if (!hasPrompted) {
            sessionStorage.setItem("linkedin_auto_connect_attempted", "true");
            setDialogReason("first-time");
            setDialogOpen(true);
          }
        }
      } catch {
        // Ignore
      }
    }

    autoPromptConnect();
  }, [checking, pathname, isExcludedPage]);

  if (checking || isExcludedPage) {
    return (
      <LinkedInConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reason={dialogReason}
      />
    );
  }

  if (!disconnected) {
    return (
      <LinkedInConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reason={dialogReason}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 mb-4 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          <span>LinkedIn posting is disconnected. Reconnect to publish posts directly.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setDialogReason("reconnect");
            setDialogOpen(true);
          }}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          Reconnect Now
        </button>
      </div>
      <LinkedInConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reason={dialogReason}
      />
    </>
  );
}
