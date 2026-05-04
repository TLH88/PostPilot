"use client";

/**
 * BP-099 Phase 2 — Mobile bottom tab bar for Launch Pad.
 *
 * Fixed to the bottom of the viewport on screens narrower than the
 * Tailwind `md` breakpoint (768px). Surfaces the same four destinations
 * as the desktop Launch Pad cards so mobile users always have one-tap
 * access to the primary actions of the app.
 *
 * Active-tab highlighting is computed from `usePathname()` — no JS
 * media-query / UA sniffing involved. Visibility itself is controlled
 * by Tailwind responsive classes on the parent (`md:hidden` on the
 * mobile shell wrapper).
 *
 * The "Create" tab is action-typed (Create = Create per owner direction
 * 2026-05-04): tapping it fires the same NewPostTitleDialog → /api/posts/create
 * flow as the desktop "Create a Post" card and the FAB. We render Phase 1's
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
  href: "/ideas?open=generate",
  label: "Ideas",
  icon: Lightbulb,
  activeWhen: (p) => p === "/ideas" || p.startsWith("/ideas/"),
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
      aria-label="Launch Pad mobile navigation"
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
        Create tab: same dialog flow as Phase 1's "Create a Post" card and the
        MobileFab. Override the shadcn Button defaults (background, padding,
        rounded corners, fixed height) so it visually fits the tab bar row.
      */}
      <NewPostButton
        label="Create"
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
      <NavTab tab={DRAFTS_TAB} pathname={pathname} />
      <NavTab tab={SCHEDULED_TAB} pathname={pathname} />
    </nav>
  );
}
