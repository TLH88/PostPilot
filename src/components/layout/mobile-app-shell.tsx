"use client";

/**
 * BP-099 Phase 2 (promotion) — Global mobile shell.
 *
 * Lifts the bottom tab bar + create-FAB out of `MobileLaunchPad` so they
 * follow the user across every (app) route below the Tailwind `md`
 * breakpoint (768px), not just `/launch-pad`. Mounted once from the
 * `(app)` layout.
 *
 * Visibility is purely Tailwind-driven (`md:hidden` on the wrapper). No
 * `useMediaQuery`, no UA sniffing — server render and client hydration
 * always agree.
 *
 * Route-aware exceptions (read from `usePathname()`):
 *
 *   • `/onboarding/*` — hide both. The wizard has its own chrome and
 *     the user shouldn't be able to navigate away mid-flow.
 *
 *   • `/posts/[id]` (the post editor) — hide the FAB only. BP-143 mounts
 *     its own AI-chat trigger pinned in this same bottom-right region;
 *     two competing affordances would conflict. The tab bar stays
 *     visible — per the BP-143 spec the editor's bottom-sheet sits
 *     above it at peek height.
 *
 * Anything else: tab bar + FAB both render.
 */

import { usePathname } from "next/navigation";
import { MobileTabBar } from "@/components/launch-pad/mobile-tab-bar";
import { MobileFab } from "@/components/launch-pad/mobile-fab";

function shouldHideShell(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

function shouldHideFab(pathname: string): boolean {
  // Match `/posts/<id>` and any sub-route, but NOT `/posts` itself
  // (the drafts list — FAB is welcome there).
  return /^\/posts\/[^/]+/.test(pathname);
}

export function MobileAppShell() {
  const pathname = usePathname();

  if (shouldHideShell(pathname)) {
    return null;
  }

  const hideFab = shouldHideFab(pathname);

  return (
    <div className="md:hidden">
      {!hideFab && <MobileFab />}
      <MobileTabBar />
    </div>
  );
}
