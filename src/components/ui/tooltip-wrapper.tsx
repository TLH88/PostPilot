"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useHelpSidebar } from "@/components/help-sidebar";
import type { TooltipEntry } from "@/lib/tooltip-content";

interface TooltipWrapperProps {
  tooltip: string | TooltipEntry;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

/**
 * Wraps any element with a tooltip. Accepts either a plain string
 * or a TooltipEntry (with optional helpUrl that opens the help sidebar).
 */
export function TooltipWrapper({ tooltip, side = "top", children }: TooltipWrapperProps) {
  const entry = typeof tooltip === "string" ? { text: tooltip } : tooltip;
  const { openHelp } = useHelpSidebar();

  // Extract article ID from helpUrl (e.g., "/help#content-library" -> "content-library")
  const helpArticleId = entry.helpUrl?.includes("#")
    ? entry.helpUrl.split("#")[1]
    : undefined;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        <span>{entry.text}</span>
        {helpArticleId && (
          <button
            type="button"
            className="ml-1 underline underline-offset-2 opacity-80 hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openHelp(helpArticleId);
            }}
          >
            Learn more
          </button>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
