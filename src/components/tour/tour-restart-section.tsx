"use client";

import { useRouter } from "next/navigation";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/lib/tours/tour-provider";
import { TOUR_NAMES } from "@/lib/tours/tour-storage";

const TOURS = [
  {
    name: TOUR_NAMES.WELCOME,
    label: "Welcome Tour",
    description: "Dashboard overview, navigation, quick actions, and key areas",
    route: "/dashboard",
  },
  {
    name: TOUR_NAMES.IDEA_TO_POST,
    label: "Idea Workflow Tour",
    description: "Generate ideas, filter by temperature/status, and develop into posts",
    route: "/ideas",
  },
  {
    name: TOUR_NAMES.POST_EDITOR,
    label: "Post Editor Tour",
    description: "Progress bar, writing, AI assistant, publishing, and images",
    route: "/posts",
  },
];

/**
 * Navigate to the correct page, then start the tour after a delay
 * so elements have time to mount.
 */
function useRestartTour() {
  const { startTour, resetTour } = useTour();
  const router = useRouter();

  return function restartTour(tourName: string, route: string) {
    resetTour(tourName);
    router.push(route);
    // Delay to let the page render and tour target elements mount
    setTimeout(() => {
      startTour(tourName);
    }, 1200);
  };
}

/**
 * Section for the Help page that lets users restart guided tours.
 */
export function TourRestartSection() {
  const restartTour = useRestartTour();

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
            onClick={() => restartTour(tour.name, tour.route)}
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
 * Navigates to the correct page before starting the tour.
 */
export function RunTourButton({ tourName, label = "Run guided tour" }: { tourName: string; label?: string }) {
  const restartTour = useRestartTour();
  const route = TOURS.find((t) => t.name === tourName)?.route ?? "/dashboard";

  return (
    <button
      type="button"
      onClick={() => restartTour(tourName, route)}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
    >
      <Play className="size-3" />
      {label}
    </button>
  );
}
