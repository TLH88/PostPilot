"use client";

/**
 * BP-099: Home-screen mode picker for the Settings → Appearance section.
 *
 * Mirrors the visual pattern of <ThemeSetting> (tiled selector) and writes
 * to the same `/api/profile/ui-mode` endpoint that the top-bar view toggle
 * uses. Switching here also triggers `router.refresh()` so the user sees
 * the change take effect on the next page navigation without a full reload.
 *
 * Mobile users are not shown this control on small screens — their UI is
 * fixed regardless of `ui_mode` (per design doc §4). On desktop it is
 * always visible.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, LayoutDashboard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UiMode = "focus" | "standard";

const modes: ReadonlyArray<{
  value: UiMode;
  label: string;
  description: string;
  icon: typeof LayoutGrid;
}> = [
  {
    value: "focus",
    label: "Focus View",
    description: "A simplified home with the four most common actions.",
    icon: LayoutGrid,
  },
  {
    value: "standard",
    label: "Full Dashboard",
    description: "The full app with all menus, tools, and metrics.",
    icon: LayoutDashboard,
  },
];

interface HomeScreenSettingProps {
  initialMode: UiMode;
}

export function HomeScreenSetting({ initialMode }: HomeScreenSettingProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<UiMode>(initialMode);
  const [submitting, setSubmitting] = useState<UiMode | null>(null);
  const [, startTransition] = useTransition();

  async function handleSelect(mode: UiMode) {
    if (mode === selected || submitting) return;

    setSubmitting(mode);
    try {
      const res = await fetch("/api/profile/ui-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not save preference. Please try again.");
        setSubmitting(null);
        return;
      }

      setSelected(mode);
      setSubmitting(null);
      toast.success(
        mode === "focus"
          ? "Home screen set to Focus View."
          : "Home screen set to Full Dashboard."
      );
      // Refresh server components so the layout/dashboard branch picks
      // up the new value if the user navigates back to the home page.
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not save preference. Please try again.");
      setSubmitting(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = selected === m.value;
        const isPending = submitting === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => handleSelect(m.value)}
            disabled={!!submitting}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors cursor-pointer",
              isActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30 hover:bg-hover-highlight",
              submitting && !isPending && "opacity-50",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <Icon
                className={cn(
                  "size-5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              {isPending && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                isActive ? "text-primary" : "text-foreground"
              )}
            >
              {m.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {m.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
