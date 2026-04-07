"use client";

import { Sparkles, Filter, FileEdit, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdeaProcessFlowProps {
  activeStep?: 1 | 2 | 3;
}

const STEPS = [
  {
    step: 1,
    icon: Sparkles,
    title: "Generate Ideas",
    description: "Brainstorm with AI or capture ideas manually",
  },
  {
    step: 2,
    icon: Filter,
    title: "Filter & Organize",
    description: "Rate, tag, and prioritize your best ideas",
  },
  {
    step: 3,
    icon: FileEdit,
    title: "Develop into Posts",
    description: "Turn top ideas into polished LinkedIn posts",
  },
] as const;

export function IdeaProcessFlow({ activeStep = 1 }: IdeaProcessFlowProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.step <= activeStep;
          const isCurrent = s.step === activeStep;

          return (
            <div key={s.step} className="flex items-center flex-1 last:flex-initial">
              {/* Step content */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-tight truncate",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                    {s.description}
                  </p>
                </div>
              </div>

              {/* Arrow connector */}
              {i < STEPS.length - 1 && (
                <div className="mx-3 flex-shrink-0">
                  <ArrowRight
                    className={cn(
                      "size-4",
                      s.step < activeStep
                        ? "text-primary"
                        : "text-muted-foreground/30"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
