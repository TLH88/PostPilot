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
import { GenerateIdeasDialog } from "@/components/ideas/generate-ideas-dialog";

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
      if (statusFilter === "open" && !["captured", "developing"].includes(idea.status)) return false;
      if (statusFilter === "closed" && !["converted", "archived"].includes(idea.status)) return false;
      if (!["all", "open", "closed"].includes(statusFilter) && idea.status !== statusFilter) return false;
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <Button onClick={() => setGenerateOpen(true)} className="shrink-0 self-start sm:self-center">
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

          {/* Open Ideas group pill — always visible */}
          <FilterPill
            active={statusFilter === "open"}
            onClick={() => setStatusFilter("open")}
          >
            Open Ideas
          </FilterPill>

          {/* Sub-filters for Open: show when Open is selected */}
          {statusFilter === "open" && (
            <>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("captured")}
              >
                {IDEA_STATUSES.captured.label}
              </FilterPill>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("developing")}
              >
                {IDEA_STATUSES.developing.label}
              </FilterPill>
            </>
          )}

          {/* Individual open status selected — show siblings + parent */}
          {statusFilter === "captured" && (
            <>
              <FilterPill
                active={true}
                onClick={() => setStatusFilter("captured")}
              >
                {IDEA_STATUSES.captured.label}
              </FilterPill>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("developing")}
              >
                {IDEA_STATUSES.developing.label}
              </FilterPill>
            </>
          )}
          {statusFilter === "developing" && (
            <>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("captured")}
              >
                {IDEA_STATUSES.captured.label}
              </FilterPill>
              <FilterPill
                active={true}
                onClick={() => setStatusFilter("developing")}
              >
                {IDEA_STATUSES.developing.label}
              </FilterPill>
            </>
          )}

          {/* Closed Ideas group pill — always visible */}
          <FilterPill
            active={statusFilter === "closed"}
            onClick={() => setStatusFilter("closed")}
          >
            Closed Ideas
          </FilterPill>

          {/* Sub-filters for Closed: show when Closed is selected */}
          {statusFilter === "closed" && (
            <>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("converted")}
              >
                {IDEA_STATUSES.converted.label}
              </FilterPill>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("archived")}
              >
                {IDEA_STATUSES.archived.label}
              </FilterPill>
            </>
          )}

          {/* Individual closed status selected — show siblings + parent */}
          {statusFilter === "converted" && (
            <>
              <FilterPill
                active={true}
                onClick={() => setStatusFilter("converted")}
              >
                {IDEA_STATUSES.converted.label}
              </FilterPill>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("archived")}
              >
                {IDEA_STATUSES.archived.label}
              </FilterPill>
            </>
          )}
          {statusFilter === "archived" && (
            <>
              <FilterPill
                active={false}
                onClick={() => setStatusFilter("converted")}
              >
                {IDEA_STATUSES.converted.label}
              </FilterPill>
              <FilterPill
                active={true}
                onClick={() => setStatusFilter("archived")}
              >
                {IDEA_STATUSES.archived.label}
              </FilterPill>
            </>
          )}

          {/* All — always visible */}
          <FilterPill
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </FilterPill>
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
                      Archive
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
        onPillarsUpdated={(updated) => setContentPillars(updated)}
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
