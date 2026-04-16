"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { IDEA_STATUSES, IDEA_PRIORITIES, type IdeaPriority } from "@/lib/constants";
import type { Idea } from "@/types";
import { TagInput } from "@/components/ui/tag-input";
import { CreateIdeaDialog } from "@/components/ideas/create-idea-dialog";
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
import { IdeaProcessFlow } from "@/components/ideas/idea-process-flow";
import { TooltipWrapper } from "@/components/ui/tooltip-wrapper";
import { IDEAS_TOOLTIPS } from "@/lib/tooltip-content";
// Tutorial system - IDs on elements are used by the tutorial overlay

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
  const [priority, setPriority] = useState<IdeaPriority | null>(idea.priority ?? null);
  const [tags, setTags] = useState<string[]>(idea.tags ?? []);
  const [saving, setSaving] = useState(false);

  // Reset local state when a different idea is opened
  useEffect(() => {
    setTitle(idea.title);
    setDescription(idea.description ?? "");
    setPriority(idea.priority ?? null);
    setTags(idea.tags ?? []);
  }, [idea]);

  async function handleSave() {
    setSaving(true);
    await onSave({
      title,
      description: description || null,
      priority,
      tags,
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
            <Label>Priority</Label>
            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={priority === null}
                onClick={() => setPriority(null)}
              >
                None
              </FilterPill>
              {(Object.keys(IDEA_PRIORITIES) as IdeaPriority[])
                .slice()
                .sort((a, b) => IDEA_PRIORITIES[a].order - IDEA_PRIORITIES[b].order)
                .map((key) => (
                  <FilterPill
                    key={key}
                    active={priority === key}
                    onClick={() => setPriority(key)}
                  >
                    {IDEA_PRIORITIES[key].label}
                  </FilterPill>
                ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <TagInput
              id="edit-tags"
              value={tags}
              onChange={setTags}
              placeholder="Type and press Enter to add..."
              maxTags={20}
            />
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
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all"); // "all" | "none" | IdeaPriority
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sort
  type SortMode =
    | "created_desc"
    | "created_asc"
    | "updated_desc"
    | "updated_asc"
    | "priority_desc"
    | "priority_asc";
  const [sortMode, setSortMode] = useState<SortMode>("created_desc");
  const SORT_LABELS: Record<SortMode, string> = {
    created_desc: "Newest first",
    created_asc: "Oldest first",
    updated_desc: "Recently updated",
    updated_asc: "Least recently updated",
    priority_desc: "Priority: High → Low",
    priority_asc: "Priority: Low → High",
  };

  // Tutorial target IDs are on elements for the tutorial overlay

  // Dialog states
  const [generateOpen, setGenerateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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

  // Unique tags across all ideas, alphabetized — used by the tag filter UI
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const idea of ideas) {
      for (const tag of idea.tags ?? []) {
        set.add(tag);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ideas]);

  // Client-side filtering: status AND priority AND tags AND search
  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      // Status
      if (statusFilter === "open" && !["captured", "developing"].includes(idea.status)) return false;
      if (statusFilter === "closed" && !["converted", "archived"].includes(idea.status)) return false;
      if (!["all", "open", "closed"].includes(statusFilter) && idea.status !== statusFilter) return false;

      // Priority
      if (priorityFilter !== "all") {
        if (priorityFilter === "none" && idea.priority !== null) return false;
        if (priorityFilter !== "none" && idea.priority !== priorityFilter) return false;
      }

      // Tags — AND semantics: idea must contain every selected filter tag
      if (tagFilter.length > 0) {
        const ideaTags = idea.tags ?? [];
        const hasAll = tagFilter.every((t) =>
          ideaTags.some((it) => it.toLowerCase() === t.toLowerCase())
        );
        if (!hasAll) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = idea.title.toLowerCase().includes(q);
        const matchesDesc = idea.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [ideas, statusFilter, priorityFilter, tagFilter, searchQuery]);

  // Sort the filtered list. Unprioritized ideas always fall to the bottom on
  // priority sorts since "no priority" is the default state, not a rank.
  const sortedIdeas = useMemo(() => {
    const list = [...filteredIdeas];
    const priorityRank = (p: Idea["priority"]): number => {
      if (!p) return -1;
      return IDEA_PRIORITIES[p].order;
    };

    switch (sortMode) {
      case "created_asc":
        list.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "updated_desc":
        list.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        break;
      case "updated_asc":
        list.sort(
          (a, b) =>
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        );
        break;
      case "priority_desc":
        // High -> Low, unprioritized last. Tie-break on newest first.
        list.sort((a, b) => {
          const pa = priorityRank(a.priority);
          const pb = priorityRank(b.priority);
          if (pa !== pb) {
            // Push unprioritized (-1) to bottom regardless of direction
            if (pa === -1) return 1;
            if (pb === -1) return -1;
            return pb - pa;
          }
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        break;
      case "priority_asc":
        // Low -> High, unprioritized last. Tie-break on newest first.
        list.sort((a, b) => {
          const pa = priorityRank(a.priority);
          const pb = priorityRank(b.priority);
          if (pa !== pb) {
            if (pa === -1) return 1;
            if (pb === -1) return -1;
            return pa - pb;
          }
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        break;
      case "created_desc":
      default:
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }
    return list;
  }, [filteredIdeas, sortMode]);

  // Add/remove a tag from the filter (used by the click-tag-to-filter pattern)
  function toggleTagFilter(tag: string) {
    setTagFilter((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      return exists
        ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag];
    });
  }

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

      // Workspace mode: auto-assign creator, attach workspace
      const activeWorkspaceId = getActiveWorkspaceId();
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        idea_id: idea.id,
        title: idea.title,
        content: "",
        status: "draft",
        hashtags: [],
        character_count: 0,
      };
      if (activeWorkspaceId) {
        insertPayload.workspace_id = activeWorkspaceId;
        insertPayload.assigned_to = user.id;
        insertPayload.assigned_by = user.id;
        insertPayload.assigned_at = new Date().toISOString();
      }

      // Create a new post linked to this idea
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert(insertPayload)
        .select("id")
        .single();

      if (postError) throw postError;

      // Log activity
      logActivity(supabase, {
        user_id: user.id,
        workspace_id: activeWorkspaceId,
        post_id: post.id,
        action: "post_created",
        details: { source: "idea", idea_id: idea.id },
      });

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
      router.push(`/posts/${post.id}?fromIdea=true&ideaDescription=${encodeURIComponent(idea.description || "")}`);
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
        <div className="flex flex-wrap gap-2 shrink-0 self-start sm:self-center">
          <Button
            variant="outline"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Add Idea
          </Button>
          <TooltipWrapper tooltip={IDEAS_TOOLTIPS.generateIdeas} side="bottom">
            <Button id="tour-generate-ideas-btn" onClick={() => setGenerateOpen(true)}>
              <Sparkles className="size-4" />
              Generate Ideas
            </Button>
          </TooltipWrapper>
        </div>
      </div>

      {/* Idea Process Flow */}
      <div id="tour-idea-process-flow">
      <IdeaProcessFlow
        activeStep={
          ideas.length === 0
            ? 1
            : ideas.some((i) => i.status === "captured" || i.status === "developing")
              ? 2
              : 3
        }
      />
      </div>

      {/* Filter Bar */}
      <div id="tour-idea-filters" className="space-y-3">
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

        {/* Priority filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            Priority:
          </span>
          <FilterPill
            active={priorityFilter === "all"}
            onClick={() => setPriorityFilter("all")}
          >
            All
          </FilterPill>
          {(Object.keys(IDEA_PRIORITIES) as IdeaPriority[])
            .slice()
            .sort((a, b) => IDEA_PRIORITIES[b].order - IDEA_PRIORITIES[a].order)
            .map((key) => (
              <FilterPill
                key={key}
                active={priorityFilter === key}
                onClick={() => setPriorityFilter(key)}
              >
                {IDEA_PRIORITIES[key].label}
              </FilterPill>
            ))}
          <FilterPill
            active={priorityFilter === "none"}
            onClick={() => setPriorityFilter("none")}
          >
            No Priority
          </FilterPill>
        </div>

        {/* Tag filter (only shown when there are tags to filter by) */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Tags:
            </span>
            {tagFilter.length === 0 ? (
              <span className="text-xs text-primary italic">
                Click a tag on any idea to filter
              </span>
            ) : (
              tagFilter.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTagFilter(tag)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {tag}
                  <X className="size-3" />
                </button>
              ))
            )}
            {tagFilter.length > 0 && (
              <button
                type="button"
                onClick={() => setTagFilter([])}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear tags
              </button>
            )}
          </div>
        )}

        {/* Search + Sort row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 !border-primary"
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              Sort by:
            </span>
            <Select
              value={sortMode}
              onValueChange={(v) => {
                if (v) setSortMode(v as SortMode);
              }}
            >
              <SelectTrigger className="w-[220px] !border-primary">
                <SelectValue>{SORT_LABELS[sortMode]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">
                  {SORT_LABELS.created_desc}
                </SelectItem>
                <SelectItem value="created_asc">
                  {SORT_LABELS.created_asc}
                </SelectItem>
                <SelectItem value="updated_desc">
                  {SORT_LABELS.updated_desc}
                </SelectItem>
                <SelectItem value="updated_asc">
                  {SORT_LABELS.updated_asc}
                </SelectItem>
                <SelectItem value="priority_desc">
                  {SORT_LABELS.priority_desc}
                </SelectItem>
                <SelectItem value="priority_asc">
                  {SORT_LABELS.priority_asc}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      {sortedIdeas.length === 0 ? (
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
                setStatusFilter("all");
                setPriorityFilter("all");
                setTagFilter([]);
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          </div>
        )
      ) : (
        <div id="tour-idea-card" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedIdeas.map((idea) => {
            const status =
              IDEA_STATUSES[idea.status as keyof typeof IDEA_STATUSES];
            const priorityInfo = idea.priority
              ? IDEA_PRIORITIES[idea.priority]
              : null;
            const isDeveloping = developingId === idea.id;

            return (
              <Card key={idea.id} className="flex flex-col">
                <CardContent className="flex-1 space-y-2">
                  {/* Top row: priority (left) + status (right) */}
                  {(priorityInfo || status) && (
                    <div className="flex items-center justify-between gap-2">
                      {priorityInfo ? (
                        <Badge
                          variant="secondary"
                          className={`${priorityInfo.color} text-[10px]`}
                        >
                          {priorityInfo.label} Priority
                        </Badge>
                      ) : (
                        <span />
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
                  )}

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

                  {/* Content pillars */}
                  {idea.content_pillars && idea.content_pillars.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {idea.content_pillars.map((pillar: string) => (
                        <Badge key={pillar} variant="outline" className="text-[10px] h-4">
                          {pillar}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Tags (clickable to filter) */}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {idea.tags.map((tag) => {
                        const isInFilter = tagFilter.some(
                          (t) => t.toLowerCase() === tag.toLowerCase()
                        );
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTagFilter(tag)}
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                              isInFilter
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                            }`}
                            title={isInFilter ? `Remove "${tag}" from filter` : `Filter by "${tag}"`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(idea.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </CardContent>

                {/* Actions */}
                <CardFooter className="gap-2">
                  <TooltipWrapper tooltip={IDEAS_TOOLTIPS.develop}>
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
                  </TooltipWrapper>
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

      {/* Create Idea (manual) Dialog */}
      <CreateIdeaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        contentPillars={contentPillars}
        onIdeaCreated={(newIdea) => setIdeas((prev) => [newIdea, ...prev])}
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
