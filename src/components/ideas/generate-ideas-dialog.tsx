"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { IDEA_TEMPERATURES } from "@/lib/constants";
import type { Idea } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Plus, Check } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types for generated ideas from the brainstorm API
// ---------------------------------------------------------------------------
interface GeneratedIdea {
  title: string;
  description: string;
  temperature: "hot" | "warm" | "cold";
  content_pillar?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Pill button filter component
// ---------------------------------------------------------------------------
function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Reusable AI Idea Generator Dialog
// ---------------------------------------------------------------------------
export function GenerateIdeasDialog({
  open,
  onOpenChange,
  initialTopic,
  contentPillars,
  onIdeasSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTopic?: string;
  contentPillars: string[];
  onIdeasSaved?: (newIdeas: Idea[]) => void;
}) {
  const supabase = createClient();
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [selectedPillar, setSelectedPillar] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  // Update topic when initialTopic changes (e.g. from context menu selection)
  useEffect(() => {
    if (open && initialTopic !== undefined) {
      setTopic(initialTopic);
    }
  }, [open, initialTopic]);

  function resetState() {
    setTopic(initialTopic ?? "");
    setSelectedPillar("");
    setGenerating(false);
    setGeneratedIdeas([]);
    setSavingIndex(null);
    setSavedIndices(new Set());
  }

  async function handleGenerate() {
    setGenerating(true);
    setGeneratedIdeas([]);
    setSavedIndices(new Set());

    try {
      const res = await fetch("/api/ai/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          contentPillar: selectedPillar || undefined,
          count: 5,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "Failed to generate ideas";
        const action = data.action;
        toast.error(msg, {
          description: action,
          duration: 8000,
        });
        setGenerating(false);
        return;
      }

      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.ideas ?? [];
      // Map suggestedPillar from AI response to content_pillar
      const ideas: GeneratedIdea[] = raw.map(
        (item: Record<string, unknown>) => ({
          ...item,
          content_pillar:
            item.content_pillar ||
            item.suggestedPillar ||
            undefined,
        })
      );
      setGeneratedIdeas(ideas);
    } catch (error) {
      console.error("Generate ideas error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate ideas"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveIdea(idea: GeneratedIdea, index: number) {
    setSavingIndex(index);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ideas")
        .insert({
          user_id: user.id,
          title: idea.title,
          description: idea.description || null,
          temperature: idea.temperature || "warm",
          content_pillar: idea.content_pillar || null,
          tags: idea.tags || [],
          status: "captured",
          source: "ai-brainstorm",
        })
        .select()
        .single();

      if (error) throw error;

      setSavedIndices((prev) => new Set(prev).add(index));
      onIdeasSaved?.([data as Idea]);
      toast.success(`"${idea.title}" saved to your Idea Bank!`);
    } catch (error) {
      console.error("Save idea error:", error);
      toast.error("Failed to save idea. Please try again.");
    } finally {
      setSavingIndex(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            AI Idea Generator
          </DialogTitle>
          <DialogDescription>
            Let AI brainstorm LinkedIn post ideas tailored to your profile. Add
            a topic or pick a content pillar to focus the results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Topic input */}
          <div className="space-y-2">
            <Label htmlFor="gen-topic">Topic (optional)</Label>
            <Input
              id="gen-topic"
              placeholder="e.g. remote work trends, AI in healthcare..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>

          {/* Content pillar selector */}
          {contentPillars.length > 0 && (
            <div className="space-y-2">
              <Label>Content Pillar (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {contentPillars.map((pillar) => (
                  <FilterPill
                    key={pillar}
                    active={selectedPillar === pillar}
                    onClick={() =>
                      setSelectedPillar((prev) =>
                        prev === pillar ? "" : pillar
                      )
                    }
                  >
                    {pillar}
                  </FilterPill>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating ideas...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate Ideas
              </>
            )}
          </Button>

          {/* Generated ideas list */}
          {generatedIdeas.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Generated Ideas
              </p>
              {generatedIdeas.map((idea, index) => {
                const temp =
                  IDEA_TEMPERATURES[
                    idea.temperature as keyof typeof IDEA_TEMPERATURES
                  ] ?? IDEA_TEMPERATURES.warm;
                const isSaved = savedIndices.has(index);
                const isSaving = savingIndex === index;

                return (
                  <Card key={index} size="sm">
                    <CardContent className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className={temp.color}
                            >
                              {temp.icon} {temp.label}
                            </Badge>
                            {idea.content_pillar && (
                              <Badge variant="outline">
                                {idea.content_pillar}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-semibold">
                            {idea.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {idea.description}
                          </p>
                        </div>
                      </div>
                      {idea.tags && idea.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {idea.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] h-4"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="justify-end">
                      {isSaved ? (
                        <Button variant="ghost" size="sm" disabled>
                          <Check className="size-3.5 text-green-600" />
                          Saved
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveIdea(idea, index)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="size-3.5" />
                              Save to Idea Bank
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
