"use client";

/**
 * Onboarding theme picker — owner direction 2026-05-04.
 *
 * Small card on the Content Tools step that lets the user choose their
 * preferred theme. Three options: Light, Dark (default), System. Choice
 * applies immediately and persists in localStorage via next-themes — the
 * preference sticks across sessions on the same browser until the user
 * picks something else (from this card or the top-bar theme toggle).
 *
 * Cross-device persistence (saving the choice to user_profiles so signing
 * in on a new browser carries the preference across) is a future
 * enhancement — not required by the current spec.
 *
 * SSR/hydration: `useTheme()` returns `undefined` during the initial
 * render. We render a stable "dark" highlight pre-mount to avoid a
 * mismatch + flash; once mounted we read the actual chosen theme.
 */

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ThemeOption {
  value: "light" | "dark" | "system";
  label: string;
  description: string;
  icon: typeof Sun;
}

const THEMES: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright, high-contrast",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easier on the eyes",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your OS",
    icon: Monitor,
  },
];

export function ThemePickerCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Pre-mount, treat the default ("dark") as selected so the highlight
  // matches the SSR-painted theme. Post-mount, read the real value.
  const currentTheme = mounted ? theme : "dark";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300">
          <Palette className="size-4" />
        </span>
        Theme
      </h3>
      <p className="text-sm text-muted-foreground">
        Choose how PostPilot looks. You can change this anytime from the
        top bar — your choice sticks until you change it.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const Icon = t.icon;
          const isSelected = currentTheme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent/50",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-5",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-semibold",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {t.label}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {t.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
