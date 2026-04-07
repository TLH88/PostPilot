"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { TooltipEntry } from "@/lib/tooltip-content";

interface TooltipWrapperProps {
  tooltip: string | TooltipEntry;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

/**
 * Wraps any element with a tooltip. Accepts either a plain string
 * or a TooltipEntry (with optional helpUrl for a "Learn more" link).
 */
export function TooltipWrapper({ tooltip, side = "top", children }: TooltipWrapperProps) {
  const entry = typeof tooltip === "string" ? { text: tooltip } : tooltip;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        <span>{entry.text}</span>
        {entry.helpUrl && (
          <a
            href={entry.helpUrl}
            className="ml-1 underline underline-offset-2 opacity-80 hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            Learn more
          </a>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
