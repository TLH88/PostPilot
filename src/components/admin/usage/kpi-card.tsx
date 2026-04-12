"use client";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: { value: number; label: string }; // positive = good, negative = bad
  alert?: boolean; // red indicator
  className?: string;
}

export function KpiCard({ label, value, trend, alert, className }: KpiCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={cn("text-2xl font-bold", alert && "text-red-600 dark:text-red-400")}>
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "text-xs font-medium",
            trend.value > 0
              ? "text-green-600 dark:text-green-400"
              : trend.value < 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          )}
        >
          {trend.value > 0 ? "+" : ""}
          {trend.value.toFixed(1)}% {trend.label}
        </p>
      )}
    </div>
  );
}
