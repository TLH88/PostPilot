"use client";

import { useState } from "react";
import { RefreshCw, AlertCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { LinkedInConnectDialog } from "@/components/linkedin/connect-dialog";

interface RefreshAnalyticsButtonProps {
  postId: string;
  linkedinConnected: boolean;
  hasAnalyticsScope: boolean;
  onRefresh: (data: {
    impressions: number;
    reactions: number;
    comments: number;
    reposts: number;
    engagements: number;
  }) => void;
}

export function RefreshAnalyticsButton({
  postId,
  linkedinConnected,
  hasAnalyticsScope,
  onRefresh,
}: RefreshAnalyticsButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "scope_required") {
          toast.error("Analytics scope not available. Reconnect LinkedIn with analytics permissions, or enter metrics manually.");
          return;
        }
        throw new Error(data.error || "Failed to fetch analytics");
      }

      onRefresh(data);
      toast.success("Analytics refreshed from LinkedIn");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh analytics");
    } finally {
      setLoading(false);
    }
  }

  // Show reconnect prompt when scope is missing
  if (!hasAnalyticsScope) {
    return (
      <ScopeNotice linkedinConnected={linkedinConnected} />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger render={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="h-7 gap-1.5 text-xs"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      } />
      <TooltipContent side="bottom">Fetch latest engagement data from LinkedIn</TooltipContent>
    </Tooltip>
  );
}

function ScopeNotice({ linkedinConnected }: { linkedinConnected: boolean }) {
  // BP-092: When the user IS connected to LinkedIn but doesn't have the
  // r_member_postAnalytics scope, reconnecting will NOT fix it because the
  // LinkedIn app itself doesn't have the scope approved yet (blocked on
  // LinkedIn app approval per BP-025). Showing a "Reconnect" button sends
  // the user in circles. Instead, tell them the truth: analytics auto-sync
  // is coming soon, and they can enter metrics manually in the meantime.
  //
  // If they're NOT connected at all, the Connect button is still useful
  // because connecting enables publish-to-LinkedIn even without the
  // analytics scope.
  const [dialogOpen, setDialogOpen] = useState(false);

  if (linkedinConnected) {
    // Connected but no analytics scope — the honest "coming soon" message.
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>
              <span className="font-medium">Auto-sync from LinkedIn is coming soon.</span>{" "}
              Until LinkedIn approves our analytics permissions, enter your
              engagement numbers manually below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected at all — offer Connect (useful for publishing too).
  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <p>Connect your LinkedIn account to unlock direct publishing and (soon) automatic engagement sync.</p>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setDialogOpen(true)}
              className="gap-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
            >
              <Link2 className="size-3" />
              Connect LinkedIn
            </Button>
          </div>
        </div>
      </div>
      <LinkedInConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reason="first-time"
      />
    </>
  );
}
