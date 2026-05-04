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
 * The "Create" tab routes to `/posts/new` rather than firing the new-post
 * API directly — the floating action button (`MobileFab`) is the
 * dialog-driven shortcut that mirrors Phase 1's `NewPostButton` flow.
 * Splitting them keeps the tab bar a pure navigation surface (predictable
 * back/forward behavior) and keeps the dialog for the more visible FAB.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Lightbulb,
  PenLine,
  FileText,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabDef {
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

const TABS: TabDef[] = [
  {
    href: "/ideas?open=generate",
    label: "Ideas",
    icon: Lightbulb,
    activeWhen: (p) => p === "/ideas" || p.startsWith("/ideas/"),
  },
  {
    href: "/posts/new",
    label: "Create",
    icon: PenLine,
    // Editor routes (`/posts/[id]`) do not highlight Create — only the
    // explicit `/posts/new` shortcut. Keeps the active state honest.
    activeWhen: (p) => p === "/posts/new",
  },
  {
    href: "/posts",
    label: "Drafts",
    icon: FileText,
    // `/posts` index page only — sub-routes (the editor) shouldn't pin
    // Drafts as active. Matches Phase 1 desktop card destination.
    activeWhen: (p) => p === "/posts",
  },
  {
    href: "/calendar",
    label: "Scheduled",
    icon: CalendarDays,
    activeWhen: (p) => p === "/calendar" || p.startsWith("/calendar/"),
  },
];

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
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.activeWhen(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
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
      })}
    </nav>
  );
}
