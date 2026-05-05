"use client";

/**
 * Kanban view of the content lifecycle.
 *
 * Four columns, fed from two tables:
 *   - Ideas:     `ideas`  where status ∈ {captured, developing}
 *   - Drafting:  `posts`  where status = draft
 *   - Ready:     `posts`  where status ∈ {scheduled, review (Team)}
 *   - Published: `posts`  where status = posted
 *
 * Pillar filter is multi-select — empty = show all. Filter applies to
 * every column simultaneously (a card is shown if any of its content
 * pillars is in the selected set, OR if no pillars are selected).
 *
 * No drag-and-drop in this round (per owner direction). Each card has
 * explicit action buttons that call into existing flows (develop, edit,
 * schedule, archive, republish).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId, applyWorkspaceFilter } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";
import { hasFeature } from "@/lib/feature-gate";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors/to-user-message";
import type { Idea, Post } from "@/types";
import type { SubscriptionTier } from "@/lib/constants";
import { KanbanPillarFilter } from "./kanban-pillar-filter";
import { KanbanIdeaCard } from "./kanban-idea-card";
import { KanbanPostCard } from "./kanban-post-card";
import { PromoteDraftDialog } from "./promote-draft-dialog";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { NewPostButton } from "@/components/posts/new-post-button";

interface KanbanBoardProps {
  /** Ideas pulled by the parent (avoids a duplicate fetch). */
  ideas: Idea[];
  /** Pillars from the user's profile, used to drive the filter pills. */
  pillars: string[];
  userTier: SubscriptionTier;
  /** Open the existing CreateIdeaDialog. */
  onAddIdea: () => void;
  /** Open the existing EditIdeaDialog with the chosen idea pre-loaded. */
  onEditIdea: (idea: Idea) => void;
  /** Mutate the parent's ideas array — keeps both views in sync. */
  setIdeas: (updater: (prev: Idea[]) => Idea[]) => void;
}

const PUBLISHED_LIMIT = 30;

export function KanbanBoard({
  ideas,
  pillars,
  userTier,
  onAddIdea,
  onEditIdea,
  setIdeas,
}: KanbanBoardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [developingId, setDevelopingId] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<Post | null>(null);
  const userIdRef = useRef<string | null>(null);

  // ── Load posts for the three post-backed columns ────────────────────────
  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      const activeWorkspaceId = getActiveWorkspaceId();
      // Pull every status we render. Cap "posted" via order + slice.
      const { data, error } = await applyWorkspaceFilter(
        supabase
          .from("posts")
          .select("*")
          .in("status", ["draft", "scheduled", "review", "posted", "past_due"])
          .order("updated_at", { ascending: false }),
        user.id,
        activeWorkspaceId,
      );
      if (error) throw error;
      setPosts((data as Post[]) ?? []);
    } catch (err) {
      console.error("kanban: failed to load posts", err);
      toast.error(toUserMessage(err, "Couldn't load posts."));
    } finally {
      setPostsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  // ── Filtering helpers ──────────────────────────────────────────────────
  const matchesPillar = useCallback(
    (cardPillars: string[]) => {
      if (selectedPillars.length === 0) return true;
      return cardPillars.some((p) => selectedPillars.includes(p));
    },
    [selectedPillars],
  );

  const filteredIdeas = useMemo(
    () =>
      ideas
        .filter((i) => i.status === "captured" || i.status === "developing")
        .filter((i) => matchesPillar(i.content_pillars ?? [])),
    [ideas, matchesPillar],
  );

  const reviewEnabled = hasFeature(userTier, "review_status");
  const filteredDrafts = useMemo(
    () => posts.filter((p) => p.status === "draft").filter((p) => matchesPillar(p.content_pillars ?? [])),
    [posts, matchesPillar],
  );
  const filteredReady = useMemo(
    () =>
      posts
        .filter((p) =>
          reviewEnabled
            ? p.status === "scheduled" || p.status === "review" || p.status === "past_due"
            : p.status === "scheduled" || p.status === "past_due",
        )
        .filter((p) => matchesPillar(p.content_pillars ?? [])),
    [posts, reviewEnabled, matchesPillar],
  );
  const filteredPosted = useMemo(
    () =>
      posts
        .filter((p) => p.status === "posted")
        .filter((p) => matchesPillar(p.content_pillars ?? []))
        .slice(0, PUBLISHED_LIMIT),
    [posts, matchesPillar],
  );

  // ── Idea actions ───────────────────────────────────────────────────────
  async function handleArchiveIdea(ideaId: string) {
    try {
      await supabase
        .from("ideas")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", ideaId);
      setIdeas((prev) =>
        prev.map((i) => (i.id === ideaId ? { ...i, status: "archived" } : i)),
      );
      toast.success("Idea archived.");
    } catch (err) {
      toast.error(toUserMessage(err, "Failed to archive idea."));
    }
  }

  async function handleDevelopIdea(idea: Idea) {
    setDevelopingId(idea.id);
    try {
      const userId = userIdRef.current;
      if (!userId) throw new Error("Not authenticated");
      const activeWorkspaceId = getActiveWorkspaceId();
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        idea_id: idea.id,
        title: idea.title,
        content: "",
        status: "draft",
        hashtags: [],
        character_count: 0,
      };
      if (activeWorkspaceId) {
        insertPayload.workspace_id = activeWorkspaceId;
        insertPayload.assigned_to = userId;
        insertPayload.assigned_by = userId;
        insertPayload.assigned_at = new Date().toISOString();
      }
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert(insertPayload)
        .select("id")
        .single();
      if (postError) throw postError;

      logActivity(supabase, {
        user_id: userId,
        workspace_id: activeWorkspaceId,
        post_id: post.id,
        action: "post_created",
        details: { source: "idea", idea_id: idea.id },
      });

      await supabase
        .from("ideas")
        .update({ status: "converted", updated_at: new Date().toISOString() })
        .eq("id", idea.id);
      setIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? { ...i, status: "converted" } : i)),
      );

      toast.success("Post created. Opening editor…");
      router.push(
        `/posts/${post.id}?fromIdea=true&ideaDescription=${encodeURIComponent(idea.description || "")}`,
      );
    } catch (err) {
      toast.error(toUserMessage(err, "Failed to develop idea."));
      setDevelopingId(null);
    }
  }

  // ── Post actions ───────────────────────────────────────────────────────
  function handleEditPost(post: Post) {
    router.push(`/posts/${post.id}`);
  }

  function handleSchedulePost(post: Post) {
    setScheduleTarget(post);
    setScheduleOpen(true);
  }

  async function applySchedule(date: Date) {
    if (!scheduleTarget) return;
    try {
      await supabase
        .from("posts")
        .update({
          status: "scheduled",
          scheduled_for: date.toISOString(),
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleTarget.id);
      // Optimistic local update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === scheduleTarget.id
            ? {
                ...p,
                status: "scheduled",
                scheduled_for: date.toISOString(),
                scheduled_at: new Date().toISOString(),
              }
            : p,
        ),
      );
      toast.success("Scheduled.");
    } catch (err) {
      toast.error(toUserMessage(err, "Failed to schedule post."));
    } finally {
      setScheduleOpen(false);
      setScheduleTarget(null);
    }
  }

  async function handleArchivePost(postId: string) {
    try {
      await supabase
        .from("posts")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: "archived" } : p)),
      );
      toast.success("Post archived.");
    } catch (err) {
      toast.error(toUserMessage(err, "Failed to archive post."));
    }
  }

  function handleRepublishPost(post: Post) {
    // Existing republish flow — open editor with ?republish=1 query param.
    // Editor handles flipping status + showing the warning banner.
    router.push(`/posts/${post.id}?edit=true&republish=1`);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <KanbanPillarFilter
        pillars={pillars}
        selected={selectedPillars}
        onChange={setSelectedPillars}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* Ideas column */}
        <KanbanColumn
          label="Ideas"
          count={filteredIdeas.length}
          tone="blue"
          loading={false}
          footerLabel="+ Add idea"
          onFooterClick={onAddIdea}
        >
          {filteredIdeas.map((idea) => (
            <KanbanIdeaCard
              key={idea.id}
              idea={idea}
              onDevelop={handleDevelopIdea}
              onEdit={onEditIdea}
              onArchive={handleArchiveIdea}
              developing={developingId === idea.id}
            />
          ))}
        </KanbanColumn>

        {/* Drafting column */}
        <KanbanColumn
          label="Drafting"
          count={filteredDrafts.length}
          tone="amber"
          loading={postsLoading}
          footer={
            <NewPostButton
              label="Add draft"
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border/60 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            />
          }
        >
          {filteredDrafts.map((post) => (
            <KanbanPostCard
              key={post.id}
              post={post}
              column="draft"
              onEdit={handleEditPost}
              onSchedule={handleSchedulePost}
              onReschedule={handleSchedulePost}
              onArchive={handleArchivePost}
              onRepublish={handleRepublishPost}
            />
          ))}
        </KanbanColumn>

        {/* Ready column */}
        <KanbanColumn
          label="Ready"
          count={filteredReady.length}
          tone="emerald"
          loading={postsLoading}
          footerLabel="+ Promote draft"
          onFooterClick={() => setPromoteOpen(true)}
        >
          {filteredReady.map((post) => (
            <KanbanPostCard
              key={post.id}
              post={post}
              column="scheduled"
              onEdit={handleEditPost}
              onSchedule={handleSchedulePost}
              onReschedule={handleSchedulePost}
              onArchive={handleArchivePost}
              onRepublish={handleRepublishPost}
            />
          ))}
        </KanbanColumn>

        {/* Published column */}
        <KanbanColumn
          label="Published"
          count={filteredPosted.length}
          tone="slate"
          loading={postsLoading}
          /* No add button — posts get here via LinkedIn publishing only. */
        >
          {filteredPosted.map((post) => (
            <KanbanPostCard
              key={post.id}
              post={post}
              column="posted"
              onEdit={handleEditPost}
              onSchedule={handleSchedulePost}
              onReschedule={handleSchedulePost}
              onArchive={handleArchivePost}
              onRepublish={handleRepublishPost}
            />
          ))}
        </KanbanColumn>
      </div>

      {/* Pickers + dialogs */}
      <PromoteDraftDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        drafts={posts.filter((p) => p.status === "draft")}
      />

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={(o) => {
          setScheduleOpen(o);
          if (!o) setScheduleTarget(null);
        }}
        onSchedule={applySchedule}
        initialDate={
          scheduleTarget?.scheduled_for
            ? new Date(scheduleTarget.scheduled_for)
            : undefined
        }
      />
    </div>
  );
}

// ─── Column shell ──────────────────────────────────────────────────────────

type ColumnTone = "blue" | "amber" | "emerald" | "slate";

const COLUMN_TONES: Record<ColumnTone, {
  /** Surface tint that defines the column boundary */
  bg: string;
  /** Border + matching inner ring color for that "card surface" feel */
  border: string;
  ring: string;
  /** Status dot in the column header */
  dot: string;
  /** Header label color — matches the dot for visual lock-up */
  label: string;
}> = {
  blue:    { bg: "bg-blue-500/[0.06]",    border: "border-blue-500/20",    ring: "ring-blue-500/10",    dot: "bg-blue-500",    label: "text-blue-600 dark:text-blue-400" },
  amber:   { bg: "bg-amber-500/[0.06]",   border: "border-amber-500/20",   ring: "ring-amber-500/10",   dot: "bg-amber-500",   label: "text-amber-600 dark:text-amber-400" },
  emerald: { bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/20", ring: "ring-emerald-500/10", dot: "bg-emerald-500", label: "text-emerald-600 dark:text-emerald-400" },
  slate:   { bg: "bg-slate-500/[0.06]",   border: "border-slate-500/25",   ring: "ring-slate-500/10",   dot: "bg-slate-500",   label: "text-slate-600 dark:text-slate-400" },
};

function KanbanColumn({
  label,
  count,
  tone,
  loading,
  footerLabel,
  onFooterClick,
  footer,
  children,
}: {
  label: string;
  count: number;
  tone: ColumnTone;
  loading?: boolean;
  /** Default add-button footer — labeled, with a click handler. */
  footerLabel?: string;
  onFooterClick?: () => void;
  /** Custom footer node — overrides the labeled default when provided. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = COLUMN_TONES[tone];
  return (
    <div
      className={cn(
        "flex min-h-[280px] flex-col rounded-xl border p-2.5 ring-1 ring-inset",
        t.bg,
        t.border,
        t.ring,
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", t.dot)} />
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", t.label)}>
            {label}
          </span>
        </div>
        <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer — either a custom node or the default labeled add button. */}
      {footer ? (
        footer
      ) : footerLabel && onFooterClick ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onFooterClick}
          className="mt-2 w-full justify-center gap-1 border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
        >
          <Plus className="size-3" />
          {footerLabel.replace(/^\+\s*/, "")}
        </Button>
      ) : null}
    </div>
  );
}
