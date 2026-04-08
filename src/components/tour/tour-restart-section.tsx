"use client";

import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/lib/tours/tour-provider";
import { TOUR_NAMES } from "@/lib/tours/tour-storage";

const TOURS = [
  {
    name: TOUR_NAMES.WELCOME,
    label: "Welcome Tour",
    description: "Dashboard overview, navigation, quick actions, and key areas",
    page: "Dashboard",
  },
  {
    name: TOUR_NAMES.IDEA_TO_POST,
    label: "Idea Workflow Tour",
    description: "Generate ideas, filter by temperature/status, and develop into posts",
    page: "Idea Bank",
  },
  {
    name: TOUR_NAMES.POST_EDITOR,
    label: "Post Editor Tour",
    description: "Progress bar, writing, AI assistant, publishing, and images",
    page: "Post Editor",
  },
];

/**
 * Section for the Help page that lets users restart guided tours.
 * Must be a client component because it uses the useTour hook.
 */
export function TourRestartSection() {
  const { startTour, resetTour } = useTour();

  function handleRestart(tourName: string) {
    resetTour(tourName);
    startTour(tourName);
  }

  return (
    <div className="space-y-3">
      {TOURS.map((tour) => (
        <div
          key={tour.name}
          className="flex items-center justify-between rounded-lg border p-4 hover:bg-hover-highlight transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Play className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{tour.label}</p>
              <p className="text-xs text-muted-foreground">{tour.description}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => handleRestart(tour.name)}
          >
            <RotateCcw className="size-3.5" />
            Restart
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * Inline "Run this tour" button for embedding within help articles.
 */
export function RunTourButton({ tourName, label = "Run guided tour" }: { tourName: string; label?: string }) {
  const { startTour, resetTour } = useTour();

  function handleRun() {
    resetTour(tourName);
    startTour(tourName);
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
