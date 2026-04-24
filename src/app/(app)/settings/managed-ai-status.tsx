"use client";

import { useState, useEffect } from "react";
import { Sparkles, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AccessStatus = "active" | "expiring_soon" | "expired" | "personal_key" | "loading";

export function ManagedAIStatus() {
  const [status, setStatus] = useState<AccessStatus>("loading");
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // SECURITY: never fetch ciphertext columns from the browser. The
      // /api/settings/provider-keys endpoint returns only safe metadata
      // (id, provider, is_active, etc) — no encrypted key fields.
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("managed_ai_access, managed_ai_expires_at")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Check if user has their own API key via the safe API route
      let hasKey = false;
      try {
        const res = await fetch("/api/settings/provider-keys?keyType=text");
        if (res.ok) {
          const { keys } = await res.json();
          hasKey = Array.isArray(keys) && keys.length > 0;
        }
      } catch {
        // If the check fails, fall through to managed-access UI — safer default
      }
      if (hasKey) {
        setStatus("personal_key");
        return;
      }

      if (!profile.managed_ai_access) {
        setStatus("expired");
        return;
      }

      if (profile.managed_ai_expires_at) {
        const expiresAt = new Date(profile.managed_ai_expires_at);
        const now = new Date();
        const days = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setDaysLeft(days);

        if (days <= 0) {
          setStatus("expired");
        } else if (days <= 3) {
          setStatus("expiring_soon");
        } else {
          setStatus("active");
        }
      } else {
        // No expiry = permanent access (admin override)
        setStatus("active");
        setDaysLeft(null);
      }
    }
    check();
  }, [supabase]);

  if (status === "loading") return null;
  if (status === "personal_key") return null; // User has their own key, no need to show

  return (
    <div className={cn(
      "rounded-lg border p-3 text-sm",
      status === "active" && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
      status === "expiring_soon" && "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
      status === "expired" && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "active" && <Sparkles className="size-4 text-green-600 dark:text-green-400" />}
          {status === "expiring_soon" && <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />}
          {status === "expired" && <Clock className="size-4 text-red-600 dark:text-red-400" />}
          <span className="font-medium">
            {status === "active" && "Trial AI Access Active"}
            {status === "expiring_soon" && "Trial AI Access Expiring Soon"}
            {status === "expired" && "Trial AI Access Expired"}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            status === "active" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
            status === "expiring_soon" && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
            status === "expired" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
          )}
        >
          {status === "expired"
            ? "Expired"
            : daysLeft != null
              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
              : "Active"}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {status === "active" && "You're using PostPilot's AI access. No API key needed during your trial period."}
        {status === "expiring_soon" && "Your trial AI access is expiring soon. Add your own API key in the AI Provider section below to continue using AI features."}
        {status === "expired" && "Your trial AI access has expired. Add your own API key below to restore AI features, or upgrade your plan."}
      </p>
    </div>
  );
}
