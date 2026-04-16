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
  Settings,
  HelpCircle,
  Lock,
  LogOut,
  Activity,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import { NewPostButton } from "@/components/posts/new-post-button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NAV_ITEMS, SUBSCRIPTION_TIERS, TIER_BADGE_COLORS, type SubscriptionTier } from "@/lib/constants";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { hasFeature } from "@/lib/feature-gate";
import { TEAM_FEATURES_ENABLED } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Lightbulb,
  FileText,
  BookOpen,
  Calendar,
  BarChart3,
  Activity,
  CheckSquare,
};

interface SidebarProps {
  userName: string;
  userTier?: SubscriptionTier;
}

export function Sidebar({ userName, userTier = "free" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 px-5">
        <Send className="size-5 text-primary" />
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          PostPilot
        </span>
      </div>

      <Separator />

      {/* Workspace Switcher — only when Team features are enabled */}
      {TEAM_FEATURES_ENABLED && <WorkspaceSwitcher />}

      {/* New Post Button */}
      <div className="px-3 pt-4 pb-2">
        <NewPostButton
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
          label="New Post"
        />
      </div>

      {/* Navigation */}
      <nav id="tour-sidebar-nav" className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const itemFeature = "feature" in item ? item.feature : undefined;
          const itemHideWhenGated = "hideWhenGated" in item ? item.hideWhenGated : false;
          const isGated = itemFeature && !hasFeature(userTier, itemFeature);

          // Hide entirely when the item is gated and configured to hide
          // (used for Team-tier items so they vanish when BP-098 flag is off).
          if (isGated && itemHideWhenGated) return null;

          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {Icon && <Icon className="size-4 shrink-0" />}
              {item.label}
              {isGated && (
                <Lock className="size-3 ml-auto text-muted-foreground" />
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Settings, Help & Profile */}
      <div id="tour-sidebar-settings">
        <div className="space-y-1 px-3 py-2">
          <Link
            href="/settings"
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

        {/* User profile with hover sign-out */}
        <div className="group relative px-3 py-3">
        <Link
          href="/profile"
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
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate block">
              {userName}
            </span>
            <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5", TIER_BADGE_COLORS[userTier] ?? TIER_BADGE_COLORS.free)}>
              {SUBSCRIPTION_TIERS[userTier]?.label ?? "Free"}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSignOut();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </Link>
        </div>
      </div>
    </aside>
  );
}
