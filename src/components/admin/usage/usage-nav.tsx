"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ShieldCheck, Layers, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const USAGE_NAV = [
  { href: "/admin/usage", label: "Overview", icon: BarChart3 },
  { href: "/admin/usage/reliability", label: "Reliability", icon: ShieldCheck },
  { href: "/admin/usage/features", label: "Features ROI", icon: Layers },
  { href: "/admin/usage/users", label: "Users", icon: Users },
];

export function UsageNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
      {USAGE_NAV.map((item) => {
        const Icon = item.icon;
        // Exact match for overview, prefix match for sub-pages
        const isActive =
          item.href === "/admin/usage"
            ? pathname === "/admin/usage"
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
