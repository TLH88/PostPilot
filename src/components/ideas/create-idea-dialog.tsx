"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { TagInput } from "@/components/ui/tag-input";
import { IDEA_PRIORITIES, type IdeaPriority } from "@/lib/constants";
import type { Idea } from "@/types";

interface CreateIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPillars: string[];
  onIdeaCreated?: (idea: Idea) => void;
}

/**
 * Lightweight dialog for manually adding an idea without invoking the AI.
 * Fields: Title (required), Description, Content Pillar, Priority, Tags.
 * Writes to the ideas table with source='manual', status='captured'.
 */
export function CreateIdeaDialog({
  open,
  onOpenChange,
  contentPillars,
  onIdeaCreated,
}: CreateIdeaDialogProps) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentPillar, setContentPillar] = useState<string>("");
  const [priority, setPriority] = useState<IdeaPriority | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function resetState() {
    setTitle("");
    setDescription("");
    setContentPillar("");
    setPriority(null);
    setTags([]);
    setSaving(false);
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Title is required.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ideas")
        .insert({
          user_id: user.id,
          workspace_id: getActiveWorkspaceId(),
          title: trimmedTitle,
          description: description.trim() || null,
          content_pillars: contentPillar ? [contentPillar] : [],
          tags,
          priority,
          status: "captured",
          source: "manual",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Idea added to your Idea Bank!");
      onIdeaCreated?.(data as Idea);
      resetState();
      onOpenChange(false);
    } catch (error) {
      console.error("Create idea error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create idea"
      );
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetState();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            Add Idea
          </DialogTitle>
          <DialogDescription>
            Capture an idea manually. No AI required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-title"
              placeholder="What's the idea?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              placeholder="Optional — add more detail about what this post would cover..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>

          {contentPillars.length > 0 && (
            <div className="space-y-2">
              <Label>Content Pillar</Label>
              <Select
                value={contentPillar}
                onValueChange={(v) => setContentPillar(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a content pillar (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {contentPillars.map((pillar) => (
                    <SelectItem key={pillar} value={pillar}>
                      {pillar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="create-tags">Tags</Label>
            <TagInput
              id="create-tags"
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
                Save Idea
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
