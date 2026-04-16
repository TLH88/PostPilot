"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  subtitleColor?: "green" | "red" | "amber" | "muted";
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  alert?: boolean;
  className?: string;
  borderColor?: string;
  iconColor?: string;
  iconBg?: string;
}

export function KpiCard({
  label,
  value,
  subtitle,
  subtitleColor = "muted",
  icon: Icon,
  trend,
  alert,
  className,
  borderColor,
  iconColor,
  iconBg,
}: KpiCardProps) {
  const subtitleClasses: Record<string, string> = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    muted: "text-muted-foreground",
  };

  return (
    <div className={cn("rounded-xl border bg-card p-5 space-y-2", borderColor && `border-l-4 ${borderColor}`, className)}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className={cn("flex size-8 items-center justify-center rounded-lg", iconBg || "bg-muted")}>
            <Icon className={cn("size-4", iconColor || "text-muted-foreground")} />
          </div>
        )}
      </div>
      <p className={cn("text-3xl font-bold tracking-tight", alert && "text-red-600 dark:text-red-400")}>
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "text-xs font-medium flex items-center gap-1",
            trend.value > 0
              ? "text-green-600 dark:text-green-400"
              : trend.value < 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          )}
        >
          {trend.value > 0 ? "\u2197" : trend.value < 0 ? "\u2198" : ""}
          {" "}
          {trend.value > 0 ? "+" : ""}
          {trend.value.toFixed(1)}% {trend.label}
        </p>
      )}
      {subtitle && (
        <p className={cn("text-xs font-medium", subtitleClasses[subtitleColor])}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
