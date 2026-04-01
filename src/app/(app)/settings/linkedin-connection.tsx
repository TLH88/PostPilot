"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Link2Off, AlertTriangle } from "lucide-react";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

interface LinkedInStatus {
  connected: boolean;
  expiresAt: string | null;
  expired: boolean;
  memberId: string | null;
}

export function LinkedInConnection() {
  const [status, setStatus] = useState<LinkedInStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchStatus();

    // Show toast if redirected from OAuth callback
    const linkedinParam = searchParams.get("linkedin");
    if (linkedinParam === "connected") {
      toast.success("LinkedIn connected for posting!");
    } else if (linkedinParam === "error") {
      toast.error("Failed to connect LinkedIn. Please try again.");
    }
  }, [searchParams]);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silently fail — show "not connected" state
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    // Navigate to the connect route which redirects to LinkedIn OAuth
    window.location.href = "/api/linkedin/connect";
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/linkedin/disconnect", { method: "POST" });
      if (res.ok) {
        setStatus({ connected: false, expiresAt: null, expired: false, memberId: null });
        toast.success("LinkedIn disconnected.");
      } else {
        toast.error("Failed to disconnect.");
      }
    } catch {
      toast.error("Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking connection...
      </div>
    );
  }

  // Calculate days until expiry
  const daysUntilExpiry = status?.expiresAt
    ? Math.ceil(
        (new Date(status.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const expiryWarning = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  if (status?.connected && !status.expired) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="gap-1 bg-green-100 text-green-800">
            <Link2 className="size-3" />
            Connected
          </Badge>
          {expiryWarning && (
            <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
              <AlertTriangle className="size-3" />
              Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {status.expiresAt && !expiryWarning && (
          <p className="text-xs text-muted-foreground">
            Token valid until {new Date(status.expiresAt).toLocaleDateString()}
          </p>
        )}
        <div className="flex gap-2">
          {expiryWarning && (
            <Button
              size="sm"
              className="gap-1.5 bg-[#0A66C2] text-white hover:bg-[#004182]"
              onClick={handleConnect}
            >
              <LinkedInIcon className="size-3.5" />
              Reconnect
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Link2Off className="size-3.5" />
            )}
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  if (status?.expired) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800">
            <AlertTriangle className="size-3" />
            Connection Expired
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Your LinkedIn connection has expired. Reconnect to continue posting directly.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-[#0A66C2] text-white hover:bg-[#004182]"
            onClick={handleConnect}
          >
            <LinkedInIcon className="size-3.5" />
            Reconnect LinkedIn
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Link2Off className="size-3.5" />
            )}
            Remove
          </Button>
        </div>
      </div>
    );
  }

  // Not connected
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Link2Off className="size-3" />
          Not Connected
        </Badge>
      </div>
      <Button
        size="sm"
        className="gap-1.5 bg-[#0A66C2] text-white hover:bg-[#004182]"
        onClick={handleConnect}
      >
        <LinkedInIcon className="size-3.5" />
        Connect LinkedIn for Posting
      </Button>
    </div>
  );
}
