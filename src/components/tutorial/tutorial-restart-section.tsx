"use client";

import { useRouter } from "next/navigation";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@/lib/tutorials/tutorial-provider";
import { TUTORIAL_REGISTRY } from "@/lib/tutorials/tutorial-definitions";

/**
 * Section for the Help page that lets users restart tutorials.
 */
export function TutorialRestartSection() {
  const { startTutorial, resetTutorial } = useTutorial();
  const router = useRouter();

  function handleRestart(tutorialId: string) {
    const tutorial = TUTORIAL_REGISTRY[tutorialId];
    if (!tutorial) return;

    resetTutorial(tutorialId);

    // Navigate to the first step's route if specified
    const firstRoute = tutorial.steps[0]?.route;
    if (firstRoute) {
      router.push(firstRoute);
      setTimeout(() => startTutorial(tutorial), 1200);
    } else {
      startTutorial(tutorial);
    }
  }

  const overviews = Object.values(TUTORIAL_REGISTRY).filter((t) => t.category === "overview");
  const howtos = Object.values(TUTORIAL_REGISTRY).filter((t) => t.category === "howto");

  return (
    <div className="space-y-6">
      {/* Overviews */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Page Overviews</h3>
        <div className="space-y-2">
          {overviews.map((t) => (
            <TutorialRow key={t.id} tutorial={t} onRestart={handleRestart} />
          ))}
        </div>
      </div>

      {/* How-To Tutorials */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Step-by-Step Tutorials</h3>
        <div className="space-y-2">
          {howtos.map((t) => (
            <TutorialRow key={t.id} tutorial={t} onRestart={handleRestart} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TutorialRow({
  tutorial,
  onRestart,
}: {
  tutorial: { id: string; name: string; description: string; mode: string };
  onRestart: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-hover-highlight transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
          <Play className="size-3.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{tutorial.name}</p>
          <p className="text-[11px] text-muted-foreground">{tutorial.description}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={() => onRestart(tutorial.id)}
      >
        <RotateCcw className="size-3" />
        Start
      </Button>
    </div>
  );
}

/**
 * Inline "Run tutorial" button for embedding within help articles.
 */
export function RunTutorialButton({
  tutorialId,
  label = "Run tutorial",
}: {
  tutorialId: string;
  label?: string;
}) {
  const { startTutorial, resetTutorial } = useTutorial();
  const router = useRouter();

  function handleRun() {
    const tutorial = TUTORIAL_REGISTRY[tutorialId];
    if (!tutorial) return;

    resetTutorial(tutorialId);
    const firstRoute = tutorial.steps[0]?.route;
    if (firstRoute) {
      router.push(firstRoute);
      setTimeout(() => startTutorial(tutorial), 1200);
    } else {
      startTutorial(tutorial);
    }
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
