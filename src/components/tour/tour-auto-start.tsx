"use client";
import { useEffect } from "react";
import { useTour } from "@/lib/tours/tour-provider";

export function TourAutoStart({ tourName }: { tourName: string }) {
  const { startTour, isTourCompleted } = useTour();
  useEffect(() => {
    // Small delay to let the page render and elements mount
    const timer = setTimeout(() => {
      if (!isTourCompleted(tourName)) {
        startTour(tourName);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [tourName, startTour, isTourCompleted]);
  return null;
}
