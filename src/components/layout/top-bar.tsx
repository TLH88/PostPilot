"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

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
  userTier?: "free" | "creator" | "professional";
}

export function TopBar({ userName, userTier = "free" }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

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

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Sign out */}
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
