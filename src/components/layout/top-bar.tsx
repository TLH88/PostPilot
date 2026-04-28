"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { ViewToggle } from "@/components/focus-view/view-toggle";
import { NAV_ITEMS, type SubscriptionTier } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { hasFeature } from "@/lib/feature-gate";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/help") return "Help";

  for (const item of NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }

  return "PostPilot";
}

interface TopBarProps {
  userName: string;
  userTier?: SubscriptionTier;
  /** BP-099: current UI mode preference. Drives the view toggle button's
   * label and target. Defaults to 'standard' if not provided so older
   * call sites don't break. */
  uiMode?: "focus" | "standard";
}

export function TopBar({
  userName,
  userTier = "free",
  uiMode = "standard",
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

  // BP-098: Notifications bell is part of the Team-collaboration suite.
  // Hide it entirely when the master flag is off.
  const showNotificationsBell = hasFeature(userTier, "workspaces");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Page title (desktop) */}
        <h1 className="hidden text-lg font-semibold lg:block">{pageTitle}</h1>

        {/* Mobile page title */}
        <h1 className="text-lg font-semibold lg:hidden">{pageTitle}</h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Top-bar utilities — order per BP-099 §3:
            Notifications · Theme · View toggle · Sign out
            (Help icon + Account dropdown come later in Phase 1) */}
        <div id="tour-top-controls" className="flex items-center gap-1">
          {showNotificationsBell && <NotificationsBell />}
          <ThemeToggle />
          {/* BP-099: hidden on mobile — mobile users get a fixed mobile UI
              and do not see the focus/standard toggle (per design doc §4) */}
          <div className="hidden lg:block">
            <ViewToggle currentMode={uiMode} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign out"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </header>

      {/* Mobile navigation sheet */}
      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        userName={userName}
        userTier={userTier}
      />
    </>
  );
}
