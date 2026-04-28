"use client";

/**
 * BP-145: PastDueChecker — global banner.
 *
 * Previously this component rendered a full action modal in place. After the
 * 2026-04-28 incident (revoked-token round-trip showed a stale modal), the
 * walkthrough was lifted into a dedicated /posts/recovery page so OAuth
 * round-trips can land on the correct surface. This component now just polls
 * for past_due rows and renders a slim banner that links to the recovery page.
 *
 * The banner suppresses itself when the user is already on /posts/recovery
 * (no point in nagging them while they're resolving) and when they're on
 * /posts/[id] (the editor handles its own per-post status).
 */

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const SESSION_DISMISS_KEY = "pp_recovery_banner_dismissed";

export function PastDueChecker() {
  const pathname = usePathname();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const supabase = createClient();

  const refreshCount = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCount(0);
      return;
    }

    const { count: pastDueCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "past_due");

    setCount(pastDueCount ?? 0);
  }, [supabase]);

  // Initial fetch + revalidate on tab focus.
  useEffect(() => {
    refreshCount();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refreshCount();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshCount]);

  // Refresh whenever the route changes — gives us "fresh" state without
  // requiring a manual reload after fixing posts on /posts/recovery.
  useEffect(() => {
    refreshCount();
  }, [pathname, refreshCount]);

  // Honor a per-session dismiss so the banner doesn't keep popping back.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;
  if (count === 0) return null;
  // Don't render on the recovery page itself or inside the editor — those
  // surfaces handle their own per-post state.
  if (pathname.startsWith("/posts/recovery")) return null;
  if (/^\/posts\/[^/]+$/.test(pathname)) return null;

  function handleDismiss() {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-lg dark:border-amber-900/50 dark:bg-amber-950/60"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {count === 1
              ? "1 post failed to publish"
              : `${count} posts failed to publish`}
          </p>
          <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80">
            Open Recovery to resolve and get back on schedule.
          </p>
          <Button
            size="sm"
            className="mt-2 gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => router.push("/posts/recovery")}
          >
            Open Recovery
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="rounded-md p-1 text-amber-800/70 transition-colors hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200/70 dark:hover:bg-amber-900/50 dark:hover:text-amber-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
