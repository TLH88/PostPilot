"use client";

/**
 * BP-099 Phase 2 (promotion) — Global mobile shell.
 *
 * Lifts the bottom tab bar out of `MobileLaunchPad` so it follows the
 * user across every (app) route below the Tailwind `md` breakpoint
 * (768px), not just `/launch-pad`. Mounted once from the (app) layout.
 *
 * Visibility is purely Tailwind-driven (`md:hidden` on the wrapper).
 * No `useMediaQuery`, no UA sniffing — server render and client
 * hydration always agree.
 *
 * Route-aware exception: hidden during onboarding (`/onboarding/*`),
 * which has its own chrome and shouldn't allow nav-away mid-flow.
 *
 * The Create-FAB that previously lived here was dropped per owner
 * direction 2026-05-06 — the Create tab in the bar covers the same
 * job and one button per action keeps the bottom area predictable.
 * The post editor mounts its own AI-chat FAB inline; that's the one
 * exception to "no FABs anywhere globally" and lives on the page,
 * not here.
 */

import { usePathname } from "next/navigation";
import { MobileTabBar } from "@/components/launch-pad/mobile-tab-bar";

function shouldHideShell(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

export function MobileAppShell() {
  const pathname = usePathname();

  if (shouldHideShell(pathname)) {
    return null;
  }

  return (
    <div className="md:hidden">
      <MobileTabBar />
    </div>
  );
}
