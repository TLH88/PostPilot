"use client";

import { useState } from "react";
import { HelpCircle, ExternalLink, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HelpLinkProps {
  /** The anchor/article ID to display */
  anchor: string;
  /** Optional tooltip text */
  title?: string;
  /** Help article content — pass JSX to render in the panel */
  children?: React.ReactNode;
}

/**
 * Inline help icon that opens a slide-out help panel from the right.
 * The panel renders the provided children content without navigating away.
 *
 * Usage:
 * <HelpLink anchor="import-analytics" title="How to import">
 *   <p>Step-by-step instructions here...</p>
 * </HelpLink>
 */
export function HelpLink({ anchor, title, children }: HelpLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-block ml-2 align-middle text-blue-500 hover:text-blue-600 transition-colors"
        title={title ?? "Learn more"}
      >
        <HelpCircle className="size-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full max-w-lg flex-col p-0">
          <SheetHeader className="border-b px-5 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <HelpCircle className="size-4 text-primary" />
                Help
              </SheetTitle>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-4 text-sm">
              {children ?? (
                <p className="text-muted-foreground">
                  No help content available for this topic. Visit the{" "}
                  <a href="/help" className="text-primary underline underline-offset-4 hover:text-primary/80">
                    Help Center
                  </a>{" "}
                  for more information.
                </p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ── Reusable help content building blocks ──────────────────────────────────── */

export function HelpStepList({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
      {children}
    </ol>
  );
}

export function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
      <strong>Tip:</strong> {children}
    </div>
  );
}
