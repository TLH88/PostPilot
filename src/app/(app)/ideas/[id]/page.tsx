"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IDEA_TEMPERATURES, IDEA_STATUSES } from "@/lib/constants";
import type { Idea } from "@/types";
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
  Plus,
  X,
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
  const [temperature, setTemperature] = useState<Idea["temperature"]>("warm");
  const [contentPillar, setContentPillar] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
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
      setTemperature(idea.temperature);
      setContentPillar(idea.content_pillar ?? "");
      setTags(idea.tags ?? []);
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
          temperature,
          content_pillar: contentPillar || null,
          tags,
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
          content_pillar: contentPillar || null,
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
      router.push(`/posts/${post.id}`);
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

  // Add tag
  function addTag() {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setNewTag("");
    }
  }

  // Remove tag
  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  if (loading) {
    return <IdeaDetailSkeleton />;
  }

  const temp = IDEA_TEMPERATURES[temperature];
  const statusInfo = IDEA_STATUSES[status];

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
            {temp && (
              <Badge variant="secondary" className={temp.color}>
                {temp.icon} {temp.label}
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

          {/* Temperature */}
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
                {(
                  Object.keys(IDEA_TEMPERATURES) as Array<
                    keyof typeof IDEA_TEMPERATURES
                  >
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {IDEA_TEMPERATURES[key].icon}{" "}
                    {IDEA_TEMPERATURES[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pl-2.5 pr-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="default"
                onClick={addTag}
                disabled={!newTag.trim()}
              >
                <Plus className="size-4" />
                Add
              </Button>
            </div>
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
