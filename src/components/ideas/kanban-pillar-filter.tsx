"use client";

/**
 * Multi-select pillar filter for the kanban view.
 *
 * "All pillars" is always-visible; clicking it clears the selection. The
 * individual pillar pills toggle on/off and are rendered in the pillar's
 * deterministic color (see `getPillarColor`). Filter applies to all four
 * kanban columns simultaneously.
 */

import { cn } from "@/lib/utils";
import { getPillarColor } from "@/lib/pillar-color";

interface KanbanPillarFilterProps {
  pillars: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

export function KanbanPillarFilter({
  pillars,
  selected,
  onChange,
  className,
}: KanbanPillarFilterProps) {
  const allActive = selected.length === 0;

  function togglePillar(p: string) {
    if (selected.includes(p)) onChange(selected.filter((x) => x !== p));
    else onChange([...selected, p]);
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      <button
        type="button"
        onClick={() => onChange([])}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          allActive
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        )}
      >
        All pillars
      </button>

      {pillars.map((pillar) => {
        const c = getPillarColor(pillar);
        const active = selected.includes(pillar);
        return (
          <button
            key={pillar}
            type="button"
            onClick={() => togglePillar(pillar)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              c.border,
              active
                // Solid fill + contrasting text — reads clearly in both themes
                ? cn(c.bgSolid, c.textOnSolid)
                : cn(c.text, c.bgIdle, "hover:bg-accent"),
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                // Dot blends into the solid fill in active state — swap to
                // the contrasting color so it stays visible.
                active ? "bg-current opacity-80" : c.dot,
              )}
            />
            {pillar}
          </button>
        );
      })}
    </div>
  );
}
