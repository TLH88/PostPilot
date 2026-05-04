"use client";

/**
 * BP-099 Phase 2 — Mobile floating action button for Launch Pad.
 *
 * Anchored to the bottom-right of the viewport, sitting above the
 * `MobileTabBar`. Tapping it launches the same flow as the desktop
 * "Create a Post" card — namely the title-prompt dialog + `/api/posts/create`
 * round-trip in `<NewPostButton />`.
 *
 * Implementation note: rather than re-implementing the title dialog and
 * quota-aware POST logic, we render the existing `NewPostButton` here
 * with a custom className that turns it into a circular FAB. That keeps
 * the create-post code path a single source of truth — quota checks,
 * health-check timers, error toasts and post-creation telemetry stay
 * identical between mobile and desktop.
 */

import { NewPostButton } from "@/components/posts/new-post-button";
import { cn } from "@/lib/utils";

export function MobileFab() {
  return (
    <NewPostButton
      label=""
      className={cn(
        // Position: 16px above the 64px tab bar (= bottom-20). Right
        // gutter matches container padding so the FAB never crowds the
        // edge on smaller phones. z-30 sits above page content but below
        // dialogs/sheets (which use z-50).
        "fixed bottom-20 right-4 z-30",
        // Honor the iOS safe-area inset just like the tab bar so the FAB
        // doesn't collide with the home indicator on notched devices.
        "mb-[env(safe-area-inset-bottom)]",
        // Circular FAB sized for thumb reach (Material/iOS default ~56px).
        "size-14 rounded-full p-0 shadow-lg shadow-primary/20",
        // Override default Button gap (no label sibling to space).
        "gap-0",
        // Bigger tap target for the icon — the lucide icon inside
        // `NewPostButton` is `size-4` by default; we scale it up via
        // descendant selector to read better at FAB size.
        "[&>svg]:size-6"
      )}
    />
  );
}
