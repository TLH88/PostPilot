"use client";

/**
 * BP-099 Phase 2 — Mobile bottom tab bar (global).
 *
 * Fixed to the bottom of the viewport on screens narrower than the
 * Tailwind `md` breakpoint (768px). Mounted once from the (app) layout
 * via `<MobileAppShell />` so it follows the user across every (app)
 * route, not just `/launch-pad`.
 *
 * Five tabs, identical on every page (no route-aware variation, per
 * owner direction 2026-05-06 — "changing them based on the page will
 * cause confusion"):
 *
 *   Ideas | Create | Launch Pad (center) | Drafts | Scheduled
 *
 * Editorial logic: the four Phase 1 launcher cards stay in their
 * original left-to-right order with Launch Pad slotted in the middle
 * as the home/hub. Left side reads as "create flow", right side as
 * "review flow", center as "go home".
 *
 * Active-tab highlighting is computed from `usePathname()` — no JS
 * media-query / UA sniffing involved.
 *
 * The "Create" tab is action-typed (Create = Create per owner direction
 * 2026-05-04): tapping it fires the same NewPostTitleDialog → /api/posts/create
 * flow as the desktop "Create a Post" card. We render Phase 1's
 * `<NewPostButton>` here with override className so the create flow stays a
 * single source of truth (quota check, slow/fail health timers, telemetry).
 * Active-state highlighting doesn't apply — clicking opens a dialog rather
 * than navigating, so there is no "current page" semantics to mark.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Lightbulb,
  FileText,
  CalendarDays,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NewPostButton } from "@/components/posts/new-post-button";

interface NavTabDef {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Pathnames that should mark this tab as active when the user is on
   * them. Defined explicitly (not by `startsWith`) because, e.g.,
   * `/posts/123` is the post editor and shouldn't light up the Drafts
   * tab — but `/posts` itself should.
   */
  activeWhen: (pathname: string) => boolean;
}

const TAB_BUTTON_BASE =
  "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors";

const IDEAS_TAB: NavTabDef = {
  // Tab Bar Ideas opens the Idea Bank — NOT the generator. The generator
  // is reachable from inside the bank, or by tapping Create in the tab
  // bar (which prompts the user to choose generator vs. blank post).
  href: "/ideas",
  label: "Ideas",
  icon: Lightbulb,
  activeWhen: (p) => p === "/ideas" || p.startsWith("/ideas/"),
};
const LAUNCH_PAD_TAB: NavTabDef = {
  href: "/launch-pad",
  label: "Launch Pad",
  icon: Rocket,
  activeWhen: (p) => p === "/launch-pad" || p.startsWith("/launch-pad/"),
};
const DRAFTS_TAB: NavTabDef = {
  href: "/posts",
  label: "Drafts",
  icon: FileText,
  // `/posts` index page only — sub-routes (the editor) shouldn't pin
  // Drafts as active. Matches Phase 1 desktop card destination.
  activeWhen: (p) => p === "/posts",
};
const SCHEDULED_TAB: NavTabDef = {
  href: "/calendar",
  label: "Scheduled",
  icon: CalendarDays,
  activeWhen: (p) => p === "/calendar" || p.startsWith("/calendar/"),
};

function NavTab({ tab, pathname }: { tab: NavTabDef; pathname: string }) {
  const Icon = tab.icon;
  const isActive = tab.activeWhen(pathname);
  return (
    <Link
      href={tab.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        TAB_BUTTON_BASE,
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-5 shrink-0 transition-transform",
          isActive && "scale-110"
        )}
        aria-hidden="true"
      />
      <span>{tab.label}</span>
    </Link>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch justify-around",
        "border-t border-border bg-background/95 backdrop-blur",
        // Honor the iOS safe-area inset so the bar doesn't get clipped
        // by the home-indicator gesture area on notched devices.
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <NavTab tab={IDEAS_TAB} pathname={pathname} />
      {/*
        Create tab. Unlike Phase 1's direct "Create a Post" cards, the
        tab bar's Create button first asks the user how they want to
        start: from an AI-generated idea, or from a blank post they title
        themselves. `askStartChoice` flips on the pre-flight chooser inside
        <NewPostButton>; the Launch Pad cards keep the direct flow because
        they already expose both options as separate cards.

        Button-style overrides keep the tab visually consistent with the
        other nav-tabs (no background, no rounded chrome).
      */}
      <NewPostButton
        label="Create"
        askStartChoice
        className={cn(
          TAB_BUTTON_BASE,
          // Neutralize Button default-variant chrome
          "!h-auto !min-h-0 !rounded-none !bg-transparent !p-0 !shadow-none",
          "hover:!bg-transparent",
          // Match unactive nav-tab text colors (Create has no "active" route)
          "!text-muted-foreground hover:!text-foreground",
          "disabled:opacity-60",
          // Match icon size with the other tabs (NewPostButton's Plus is size-4)
          "[&>svg]:!size-5 [&>svg]:shrink-0"
        )}
      />
      <NavTab tab={LAUNCH_PAD_TAB} pathname={pathname} />
      <NavTab tab={DRAFTS_TAB} pathname={pathname} />
      <NavTab tab={SCHEDULED_TAB} pathname={pathname} />
    </nav>
  );
}
