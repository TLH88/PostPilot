"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IDEA_TEMPERATURES, IDEA_STATUSES } from "@/lib/constants";
import type { Idea } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Search,
  Lightbulb,
  Loader2,
  Pencil,
  Archive,
  ArrowRight,
  Plus,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
// Skeleton loader for initial load
// ---------------------------------------------------------------------------
function IdeasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Lightbulb className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No ideas yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Start brainstorming! Let AI spark your creativity.
      </p>
      <div className="mt-6">
        <Button onClick={onGenerate}>
          <Sparkles className="size-4" />
          Generate Ideas
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline edit dialog for an idea
// ---------------------------------------------------------------------------
function EditIdeaDialog({
  idea,
  open,
  onOpenChange,
  onSave,
}: {
  idea: Idea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: Partial<Idea>) => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description ?? "");
  const [temperature, setTemperature] = useState(idea.temperature);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      title,
      description: description || null,
      temperature,
    });
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Idea</DialogTitle>
          <DialogDescription>
            Update your idea details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Select
              value={temperature}
              onValueChange={(v) => {
                if (v) setTemperature(v as Idea["temperature"]);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(IDEA_TEMPERATURES) as Array<keyof typeof IDEA_TEMPERATURES>).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {IDEA_TEMPERATURES[key].icon} {IDEA_TEMPERATURES[key].label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// AI Idea Generator Dialog
// ---------------------------------------------------------------------------
function GenerateIdeasDialog({
  open,
  onOpenChange,
  contentPillars,
  onIdeasSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPillars: string[];
  onIdeasSaved: (newIdeas: Idea[]) => void;
}) {
  const supabase = createClient();
  const [topic, setTopic] = useState("");
  const [selectedPillar, setSelectedPillar] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  function resetState() {
    setTopic("");
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
        throw new Error(data.error || "Failed to generate ideas");
      }

      const data = await res.json();
      // The API returns either { ideas: [...] } or an array directly
      const ideas: GeneratedIdea[] = Array.isArray(data)
        ? data
        : data.ideas ?? [];
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
      onIdeasSaved([data as Idea]);
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

// ---------------------------------------------------------------------------
// Main Ideas Page
// ---------------------------------------------------------------------------
export default function IdeasPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [contentPillars, setContentPillars] = useState<string[]>([]);

  // Filters
  const [tempFilter, setTempFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [developingId, setDevelopingId] = useState<string | null>(null);

  // Load ideas and profile on mount
  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [ideasResult, profileResult] = await Promise.all([
        supabase
          .from("ideas")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("creator_profiles")
          .select("content_pillars")
          .eq("user_id", user.id)
          .single(),
      ]);

      setIdeas((ideasResult.data as Idea[]) ?? []);
      setContentPillars(profileResult.data?.content_pillars ?? []);
      setLoading(false);
    }

    loadData();
  }, [supabase]);

  // Client-side filtering
  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      if (tempFilter !== "all" && idea.temperature !== tempFilter) return false;
      if (statusFilter !== "all" && idea.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = idea.title.toLowerCase().includes(q);
        const matchesDesc = idea.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [ideas, tempFilter, statusFilter, searchQuery]);

  // Handlers
  async function handleEditSave(updated: Partial<Idea>) {
    if (!editingIdea) return;

    try {
      const { error } = await supabase
        .from("ideas")
        .update({
          ...updated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingIdea.id);

      if (error) throw error;

      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === editingIdea.id ? { ...idea, ...updated } : idea
        )
      );
      toast.success("Idea updated successfully!");
    } catch (error) {
      console.error("Edit idea error:", error);
      toast.error("Failed to update idea.");
    }
  }

  async function handleArchive(ideaId: string) {
    try {
      const { error } = await supabase
        .from("ideas")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ideaId);

      if (error) throw error;

      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, status: "archived" } : idea
        )
      );
      toast.success("Idea archived.");
    } catch (error) {
      console.error("Archive idea error:", error);
      toast.error("Failed to archive idea.");
    }
  }

  async function handleDevelop(idea: Idea) {
    setDevelopingId(idea.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create a new post linked to this idea
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          idea_id: idea.id,
          title: idea.title,
          content: "",
          status: "draft",
          hashtags: [],
          character_count: 0,
          content_pillar: idea.content_pillar || null,
        })
        .select("id")
        .single();

      if (postError) throw postError;

      // Update idea status to converted
      await supabase
        .from("ideas")
        .update({
          status: "converted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", idea.id);

      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id ? { ...i, status: "converted" } : i
        )
      );

      toast.success("Post created! Redirecting to editor...");
      router.push(`/posts/${post.id}`);
    } catch (error) {
      console.error("Develop idea error:", error);
      toast.error("Failed to create post from idea.");
      setDevelopingId(null);
    }
  }

  function handleIdeasSaved(newIdeas: Idea[]) {
    setIdeas((prev) => [...newIdeas, ...prev]);
  }

  if (loading) {
    return <IdeasSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Idea Bank</h1>
            <Badge variant="secondary" className="text-xs">
              {ideas.length}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Capture and organize content ideas. Click &quot;Generate Ideas&quot; to brainstorm with AI, or add your own manually.
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Sparkles className="size-4" />
          Generate Ideas
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="space-y-3">
        {/* Temperature filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            Temperature:
          </span>
          <FilterPill
            active={tempFilter === "all"}
            onClick={() => setTempFilter("all")}
          >
            All
          </FilterPill>
          {(
            Object.keys(IDEA_TEMPERATURES) as Array<
              keyof typeof IDEA_TEMPERATURES
            >
          ).map((key) => (
            <FilterPill
              key={key}
              active={tempFilter === key}
              onClick={() => setTempFilter(key)}
            >
              {IDEA_TEMPERATURES[key].icon} {IDEA_TEMPERATURES[key].label}
            </FilterPill>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            Status:
          </span>
          <FilterPill
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </FilterPill>
          {(
            Object.keys(IDEA_STATUSES) as Array<keyof typeof IDEA_STATUSES>
          ).map((key) => (
            <FilterPill
              key={key}
              active={statusFilter === key}
              onClick={() => setStatusFilter(key)}
            >
              {IDEA_STATUSES[key].label}
            </FilterPill>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length === 0 ? (
        ideas.length === 0 ? (
          <EmptyState onGenerate={() => setGenerateOpen(true)} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
            <p className="text-sm text-muted-foreground">
              No ideas match your filters.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setTempFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          </div>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.map((idea) => {
            const temp =
              IDEA_TEMPERATURES[
                idea.temperature as keyof typeof IDEA_TEMPERATURES
              ];
            const status =
              IDEA_STATUSES[idea.status as keyof typeof IDEA_STATUSES];
            const isDeveloping = developingId === idea.id;

            return (
              <Card key={idea.id} className="flex flex-col">
                <CardContent className="flex-1 space-y-2">
                  {/* Top row: temperature badge */}
                  <div className="flex items-center justify-between gap-2">
                    {temp && (
                      <Badge variant="secondary" className={temp.color}>
                        {temp.icon} {temp.label}
                      </Badge>
                    )}
                    {status && (
                      <Badge
                        variant="secondary"
                        className={`${status.color} text-[10px]`}
                      >
                        {status.label}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold leading-snug">
                    {idea.title}
                  </p>

                  {/* Description */}
                  {idea.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {idea.description}
                    </p>
                  )}

                  {/* Content pillar & tags */}
                  <div className="flex flex-wrap gap-1">
                    {idea.content_pillar && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        {idea.content_pillar}
                      </Badge>
                    )}
                    {idea.tags?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] h-4"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Date */}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(idea.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </CardContent>

                {/* Actions */}
                <CardFooter className="gap-2">
                  <Button
                    variant="default"
                    size="xs"
                    onClick={() => handleDevelop(idea)}
                    disabled={
                      isDeveloping || idea.status === "converted"
                    }
                  >
                    {isDeveloping ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="size-3" />
                        Develop
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditingIdea(idea)}
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                  {idea.status !== "archived" && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleArchive(idea.id)}
                    >
                      <Archive className="size-3" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Ideas Dialog */}
      <GenerateIdeasDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        contentPillars={contentPillars}
        onIdeasSaved={handleIdeasSaved}
      />

      {/* Edit Idea Dialog */}
      {editingIdea && (
        <EditIdeaDialog
          idea={editingIdea}
          open={!!editingIdea}
          onOpenChange={(open) => {
            if (!open) setEditingIdea(null);
          }}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
