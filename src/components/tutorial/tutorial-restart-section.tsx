"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, Undo2, Loader2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@postpilot/tutorial-sdk";
import { TUTORIAL_REGISTRY } from "@/lib/tutorials/definitions";
import { createClient } from "@/lib/supabase/client";
import {
  dismissTutorial,
  listDismissedTutorials,
  reEnableTutorial,
  resetAllDismissals,
} from "@/lib/tutorials/dismissals";
import { toast } from "sonner";

/**
 * Section for the Help page that lets users restart tutorials and manage
 * dismissed ones (BP-121). Dismissed tutorials show up in their own list
 * with an "Undo" button per entry plus a "Reset all tutorials" action.
 */
export function TutorialRestartSection() {
  const { startTutorial, resetTutorial } = useTutorial();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loadingDismissals, setLoadingDismissals] = useState(true);
  const [working, setWorking] = useState(false);

  // Load current user + their dismissed tutorials once.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoadingDismissals(false);
        return;
      }
      setUserId(user.id);
      const ids = await listDismissedTutorials(user.id);
      setDismissedIds(ids);
      setLoadingDismissals(false);
    });
  }, []);

  const refreshDismissals = useCallback(async () => {
    if (!userId) return;
    const ids = await listDismissedTutorials(userId);
    setDismissedIds(ids);
  }, [userId]);

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

  async function handleReEnable(tutorialId: string) {
    if (!userId) return;
    setWorking(true);
    try {
      await reEnableTutorial(userId, tutorialId);
      await refreshDismissals();
      toast.success("Tutorial re-enabled. It will appear again the next time it's eligible.");
    } catch {
      toast.error("Couldn't re-enable the tutorial. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  async function handleResetAll() {
    if (!userId) return;
    setWorking(true);
    try {
      await resetAllDismissals(userId);
      await refreshDismissals();
      toast.success("All dismissed tutorials have been re-enabled.");
    } catch {
      toast.error("Couldn't reset tutorials. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  async function handleHide(tutorialId: string) {
    if (!userId) return;
    setWorking(true);
    try {
      await dismissTutorial(userId, tutorialId);
      await refreshDismissals();
      toast.success("Tutorial hidden. Re-enable it anytime from the Dismissed list below.");
    } catch {
      toast.error("Couldn't hide the tutorial. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  const overviews = Object.values(TUTORIAL_REGISTRY).filter((t) => t.category === "overview");
  const howtos = Object.values(TUTORIAL_REGISTRY).filter((t) => t.category === "howto");

  return (
    <div className="space-y-6">
      {/* Overviews — filter out ones the user has dismissed */}
      {overviews.some((t) => !dismissedIds.includes(t.id)) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Page Overviews</h3>
          <div className="space-y-2">
            {overviews
              .filter((t) => !dismissedIds.includes(t.id))
              .map((t) => (
                <TutorialRow
                  key={t.id}
                  tutorial={t}
                  onRestart={handleRestart}
                  onHide={handleHide}
                  canHide={!!userId && !working}
                />
              ))}
          </div>
        </div>
      )}

      {/* How-To Tutorials — same dismiss filter */}
      {howtos.some((t) => !dismissedIds.includes(t.id)) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Step-by-Step Tutorials</h3>
          <div className="space-y-2">
            {howtos
              .filter((t) => !dismissedIds.includes(t.id))
              .map((t) => (
                <TutorialRow
                  key={t.id}
                  tutorial={t}
                  onRestart={handleRestart}
                  onHide={handleHide}
                  canHide={!!userId && !working}
                />
              ))}
          </div>
        </div>
      )}

      {/* Dismissed tutorials (BP-121) — only shown when there's at least one. */}
      {!loadingDismissals && dismissedIds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Dismissed Tutorials</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              disabled={working}
              className="gap-1.5"
            >
              {working ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
              Reset all
            </Button>
          </div>
          <div className="space-y-2">
            {dismissedIds.map((id) => {
              const tutorial = TUTORIAL_REGISTRY[id];
              if (!tutorial) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-dashed p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tutorial.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {tutorial.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => handleReEnable(id)}
                    disabled={working}
                  >
                    <Undo2 className="size-3" />
                    Re-enable
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TutorialRow({
  tutorial,
  onRestart,
  onHide,
  canHide,
}: {
  tutorial: { id: string; name: string; description: string; mode: string };
  onRestart: (id: string) => void;
  onHide?: (id: string) => void;
  canHide?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-hover-highlight transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <Play className="size-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{tutorial.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{tutorial.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onHide && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => onHide(tutorial.id)}
            disabled={!canHide}
            title="Hide this tutorial — re-enable anytime from the Dismissed list"
          >
            <EyeOff className="size-3" />
            Hide
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onRestart(tutorial.id)}
        >
          <RotateCcw className="size-3" />
          Start
        </Button>
      </div>
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
