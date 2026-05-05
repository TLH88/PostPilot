"use client";

import { useEffect, useState } from "react";
import { UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImpersonationStatus {
  isImpersonating: boolean;
  adminEmail?: string;
}

export function ImpersonationBanner() {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/impersonate/status")
      .then((r) => (r.ok ? r.json() : { isImpersonating: false }))
      .then(setStatus)
      .catch(() => setStatus({ isImpersonating: false }));
  }, []);

  if (!status?.isImpersonating) return null;

  async function handleExit() {
    setExiting(true);
    const res = await fetch("/api/admin/impersonate/exit", { method: "POST" });
    if (res.ok) {
      window.location.href = "/admin/users";
      return;
    }
    const data = await res.json().catch(() => ({}));
    toast.error(data.error || "Failed to exit impersonation");
    setExiting(false);
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
      <div className="flex items-center gap-2">
        <UserCog className="size-4 shrink-0" />
        <span>
          Impersonation mode — admin{" "}
          <strong className="font-semibold">{status.adminEmail}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExit}
        disabled={exiting}
        className="gap-1.5 border-amber-400 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
      >
        <X className="size-3.5" />
        {exiting ? "Exiting..." : "Exit impersonation"}
      </Button>
    </div>
  );
}
