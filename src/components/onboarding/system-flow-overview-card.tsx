"use client";

/**
 * Onboarding system-flow overview — owner direction 2026-05-12.
 *
 * Replaces the Content Library copy on the Content Tools step with a
 * 4-card visual walkthrough of PostPilot's core flow:
 *
 *   Brainstorm Ideas → Draft & Edit → Schedule → Track Performance
 *
 * Visual treatment mirrors `ThemePickerCard`: outer card with a header
 * (icon + title + short description), then a grid of small "tiles" with
 * an icon + label + tiny description. Tiles are display-only — no
 * selection state, no click handler. Owner can swap order or copy in
 * one place without touching the page-level layout.
 */

import { Lightbulb, PenLine, Calendar, LineChart, Workflow } from "lucide-react";

interface FlowStep {
  icon: typeof Lightbulb;
  /** Soft palette colors for the icon-pill background + foreground.
   *  Picked to read distinct but not gaudy in both light + dark modes. */
  bg: string;
  fg: string;
  label: string;
  description: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    icon: Lightbulb,
    bg: "bg-amber-100 dark:bg-amber-900/40",
    fg: "text-amber-700 dark:text-amber-300",
    label: "Brainstorm Ideas with AI",
    description: "Spark post ideas grounded in your voice and expertise.",
  },
  {
    icon: PenLine,
    bg: "bg-blue-100 dark:bg-blue-900/40",
    fg: "text-blue-700 dark:text-blue-300",
    label: "Draft & Edit Posts",
    description: "Write with AI assist, hook analysis, and inline suggestions.",
  },
  {
    icon: Calendar,
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    fg: "text-emerald-700 dark:text-emerald-300",
    label: "Schedule Your Posts",
    description: "Queue posts for your best times, or publish immediately.",
  },
  {
    icon: LineChart,
    bg: "bg-violet-100 dark:bg-violet-900/40",
    fg: "text-violet-700 dark:text-violet-300",
    label: "Track Performance",
    description: "See what worked and refine your strategy.",
  },
];

export function SystemFlowOverviewCard() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-300">
          <Workflow className="size-4" />
        </span>
        How PostPilot Works
      </h3>
      <p className="text-sm text-muted-foreground">
        Your end-to-end flow inside the app, from idea to insights. Every
        step is connected so you spend less time switching tools.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FLOW_STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex flex-col items-start gap-1.5 rounded-lg border-2 border-border p-3"
            >
              <div className="flex items-center gap-2 w-full">
                <span
                  className={`flex size-7 items-center justify-center rounded-full ${s.bg} ${s.fg}`}
                  aria-hidden="true"
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight">
                {s.label}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                {s.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
