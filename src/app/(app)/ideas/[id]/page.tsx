"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IDEA_STATUSES, IDEA_PRIORITIES, type IdeaPriority } from "@/lib/constants";
import type { Idea } from "@/types";
import { TagInput } from "@/components/ui/tag-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ---------------------------------------------------------------------------
// Skeleton for loading state
// ---------------------------------------------------------------------------
function IdeaDetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="rounded-xl border p-6 space-y-4">
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Idea Detail Page
// ---------------------------------------------------------------------------
export default function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [developing, setDeveloping] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentPillar, setContentPillar] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [priority, setPriority] = useState<IdeaPriority | null>(null);
  const [status, setStatus] = useState<Idea["status"]>("captured");
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [contentPillars, setContentPillars] = useState<string[]>([]);

  // Load idea data
  useEffect(() => {
    async function loadIdea() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [ideaResult, profileResult] = await Promise.all([
        supabase.from("ideas").select("*").eq("id", id).single(),
        supabase
          .from("creator_profiles")
          .select("content_pillars")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (ideaResult.error || !ideaResult.data) {
        toast.error("Idea not found.");
        router.push("/ideas");
        return;
      }

      const idea = ideaResult.data as Idea;
      setTitle(idea.title);
      setDescription(idea.description ?? "");
      setContentPillar((idea.content_pillars ?? [])[0] ?? "");
      setTags(idea.tags ?? []);
      setPriority(idea.priority ?? null);
      setStatus(idea.status);
      setCreatedAt(idea.created_at);
      setUpdatedAt(idea.updated_at);
      setContentPillars(profileResult.data?.content_pillars ?? []);
      setLoading(false);
    }

    loadIdea();
  }, [id, supabase, router]);

  // Save changes
  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("ideas")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          content_pillars: contentPillar ? [contentPillar] : [],
          tags,
          priority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setUpdatedAt(new Date().toISOString());
      toast.success("Idea saved successfully!");
    } catch (error) {
      console.error("Save idea error:", error);
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  // Develop into post
  async function handleDevelop() {
    setDeveloping(true);

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
          idea_id: id,
          title: title.trim(),
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
        .eq("id", id);

      toast.success("Post created! Redirecting to editor...");
      router.push(`/posts/${post.id}?fromIdea=true&ideaDescription=${encodeURIComponent(description || "")}`);
    } catch (error) {
      console.error("Develop idea error:", error);
      toast.error("Failed to create post from idea.");
      setDeveloping(false);
    }
  }

  // Delete idea
  async function handleDelete() {
    setDeleting(true);

    try {
      const { error } = await supabase.from("ideas").delete().eq("id", id);

      if (error) throw error;

      toast.success("Idea deleted.");
      router.push("/ideas");
    } catch (error) {
      console.error("Delete idea error:", error);
      toast.error("Failed to delete idea.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <IdeaDetailSkeleton />;
  }

  const statusInfo = IDEA_STATUSES[status];
  const priorityInfo = priority ? IDEA_PRIORITIES[priority] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        render={<Link href="/ideas" />}
      >
        <ArrowLeft className="size-3.5" />
        Back to Ideas
      </Button>

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {priorityInfo && (
              <Badge variant="secondary" className={priorityInfo.color}>
                {priorityInfo.label} Priority
              </Badge>
            )}
            {statusInfo && (
              <Badge variant="secondary" className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Created{" "}
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            {updatedAt !== createdAt && (
              <>
                {" "}
                &middot; Updated{" "}
                {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={handleDevelop}
            disabled={developing || status === "converted"}
          >
            {developing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating Post...
              </>
            ) : (
              <>
                <ArrowRight className="size-4" />
                Develop into Post
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Idea Details</CardTitle>
          <CardDescription>
            Edit your idea and refine it before developing it into a post.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="idea-title">Title</Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your idea a catchy title..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="idea-description">Description</Label>
            <Textarea
              id="idea-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your idea in more detail..."
              className="min-h-28"
            />
          </div>

          {/* Content Pillar */}
          <div className="space-y-2">
            <Label>Content Pillar</Label>
            {contentPillars.length > 0 ? (
              <Select
                value={contentPillar}
                onValueChange={(v) => setContentPillar(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a content pillar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {contentPillars.map((pillar) => (
                    <SelectItem key={pillar} value={pillar}>
                      {pillar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={contentPillar}
                onChange={(e) => setContentPillar(e.target.value)}
                placeholder="Enter a content pillar..."
              />
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPriority(null)}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  priority === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                None
              </button>
              {(Object.keys(IDEA_PRIORITIES) as IdeaPriority[])
                .slice()
                .sort((a, b) => IDEA_PRIORITIES[a].order - IDEA_PRIORITIES[b].order)
                .map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      priority === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {IDEA_PRIORITIES[key].label}
                  </button>
                ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="detail-tags">Tags</Label>
            <TagInput
              id="detail-tags"
              value={tags}
              onChange={setTags}
              placeholder="Type and press Enter to add..."
              maxTags={20}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pb-8">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Delete Idea
        </Button>
        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this idea? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
