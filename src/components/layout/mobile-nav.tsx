"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Send,
  LayoutDashboard,
  Lightbulb,
  FileText,
  BarChart3,
  BookOpen,
  Calendar,
  Lock,
  Plus,
  Settings,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, type SubscriptionTier } from "@/lib/constants";
import { hasFeature } from "@/lib/feature-gate";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Lightbulb,
  FileText,
  BookOpen,
  Calendar,
  BarChart3,
};

const NAV_GATE_MAP: Record<string, string> = {
  "/library": "content_library",
  "/analytics": "analytics",
};

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userTier?: SubscriptionTier;
}

export function MobileNav({ open, onOpenChange, userName, userTier = "free" }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const name = userName || "User";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleLinkClick() {
    onOpenChange(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onOpenChange(false);
    router.push("/login");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">PostPilot</span>
          </SheetTitle>
        </SheetHeader>

        {/* New Post Button */}
        <div className="px-3 pt-4 pb-2">
          <Link
            href="/posts"
            onClick={handleLinkClick}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
          >
            <Plus className="size-4" />
            New Post
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
                {item.label}
                {NAV_GATE_MAP[item.href] && !hasFeature(userTier, NAV_GATE_MAP[item.href]) && (
                  <Lock className="size-3 ml-auto text-muted-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Settings & Help */}
        <div className="space-y-1 px-3 py-2">
          <Link
            href="/settings"
            onClick={handleLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="size-4 shrink-0" />
            Settings
          </Link>
          <Link
            href="/help"
            onClick={handleLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/help"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <HelpCircle className="size-4 shrink-0" />
            Help
          </Link>
        </div>

        <Separator />

        {/* User profile */}
        <div className="px-3 py-3">
          <Link
            href="/profile"
            onClick={handleLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              pathname === "/profile"
                ? "bg-sidebar-accent"
                : "hover:bg-sidebar-accent"
            )}
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {name}
            </span>
          </Link>
        </div>

        <Separator />

        {/* Sign out */}
        <div className="px-3 py-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4 shrink-0" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
