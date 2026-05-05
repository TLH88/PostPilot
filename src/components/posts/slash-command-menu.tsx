"use client";

/**
 * Floating autocomplete menu for slash commands. Used in both the editor
 * textarea and the AI chat input.
 *
 * The host component owns:
 *   - whether the menu is open (a `/` was detected at caret)
 *   - the current query string
 *   - where to anchor the menu (caret position or fallback element rect)
 *
 * This component owns:
 *   - rendering the filtered list
 *   - keyboard nav (↑/↓ to move, Enter/Tab to select, Esc to close)
 *   - click-to-select
 *
 * Keyboard interception is exposed via `onKeyDown` — the host should call
 * it from its input/textarea onKeyDown so arrow keys / enter route to the
 * menu while it's open.
 */

import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { filterSlashCommands, type SlashCommand } from "@/lib/slash-commands";

export interface SlashCommandMenuHandle {
  /** Forward a key event from the host input. Returns true if handled. */
  handleKey: (e: KeyboardEvent | React.KeyboardEvent) => boolean;
}

interface SlashCommandMenuProps {
  open: boolean;
  query: string;
  /** Viewport-relative coordinate to anchor the menu's top-left corner. */
  anchor: { top: number; left: number } | null;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
  /** Position the menu above (true) or below (false) the anchor. Default false. */
  placeAbove?: boolean;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  SlashCommandMenuProps
>(function SlashCommandMenu(
  { open, query, anchor, onSelect, onClose, placeAbove = false },
  ref,
) {
  const items = useMemo(() => filterSlashCommands(query), [query]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset selection whenever the filtered list changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll the active item into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-slash-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useImperativeHandle(
    ref,
    () => ({
      handleKey: (e) => {
        if (!open || items.length === 0) return false;
        if (e.key === "ArrowDown") {
          setActiveIndex((i) => (i + 1) % items.length);
          e.preventDefault();
          return true;
        }
        if (e.key === "ArrowUp") {
          setActiveIndex((i) => (i - 1 + items.length) % items.length);
          e.preventDefault();
          return true;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          const cmd = items[activeIndex];
          if (cmd) {
            e.preventDefault();
            onSelect(cmd);
          }
          return true;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return true;
        }
        return false;
      },
    }),
    [open, items, activeIndex, onSelect, onClose],
  );

  if (!open || !anchor || items.length === 0) return null;

  const style: React.CSSProperties = placeAbove
    ? { position: "fixed", left: anchor.left, bottom: window.innerHeight - anchor.top + 4, zIndex: 60 }
    : { position: "fixed", left: anchor.left, top: anchor.top + 4, zIndex: 60 };

  return (
    <div
      style={style}
      className="w-72 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
      role="listbox"
      ref={listRef}
    >
      {items.map((cmd, i) => (
        <button
          key={cmd.trigger}
          type="button"
          data-slash-index={i}
          role="option"
          aria-selected={i === activeIndex}
          onMouseEnter={() => setActiveIndex(i)}
          onMouseDown={(e) => {
            // mousedown (not click) so the input doesn't lose focus first.
            e.preventDefault();
            onSelect(cmd);
          }}
          className={cn(
            "flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
            i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          )}
        >
          <span className="flex w-full items-center gap-2 text-sm font-medium">
            <span className="text-primary">/{cmd.trigger}</span>
            <span className="text-foreground/80">{cmd.label}</span>
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
});
