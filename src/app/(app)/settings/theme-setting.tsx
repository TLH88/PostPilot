"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <div
            key={t.value}
            className="flex h-20 items-center justify-center rounded-lg border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {themes.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.value;

        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors cursor-pointer",
              isActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30 hover:bg-hover-highlight"
            )}
          >
            <Icon
              className={cn(
                "size-5",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
