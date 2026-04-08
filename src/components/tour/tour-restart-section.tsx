"use client";

import { useRouter } from "next/navigation";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/lib/tours/tour-provider";
import { TOUR_NAMES } from "@/lib/tours/tour-storage";

/**
 * Section for the Help page that lets users restart the guided tour.
 */
export function TourRestartSection() {
  const { startTour, resetTour } = useTour();
  const router = useRouter();

  function handleRestart() {
    resetTour(TOUR_NAMES.WELCOME);
    router.push("/dashboard");
    setTimeout(() => startTour(TOUR_NAMES.WELCOME), 1200);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-hover-highlight transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
            <Play className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Full Product Walkthrough</p>
            <p className="text-xs text-muted-foreground">
              End-to-end tour: Dashboard, Idea Generator, Post Editor, Calendar, and Publishing (17 steps)
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={handleRestart}
        >
          <RotateCcw className="size-3.5" />
          Restart Tour
        </Button>
      </div>
    </div>
  );
}

/**
 * Inline "Run this tour" button for embedding within help articles.
 */
export function RunTourButton({ label = "Run guided tour" }: { tourName?: string; label?: string }) {
  const { startTour, resetTour } = useTour();
  const router = useRouter();

  function handleRun() {
    resetTour(TOUR_NAMES.WELCOME);
    router.push("/dashboard");
    setTimeout(() => startTour(TOUR_NAMES.WELCOME), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleRun}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
    >
      <Play className="size-3" />
      {label}
    </button>
  );
}
