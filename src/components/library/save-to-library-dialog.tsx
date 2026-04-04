"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_LIBRARY_TYPES } from "@/lib/constants";
import { toast } from "sonner";

interface SaveToLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  contentPillars?: string[];
  onSaved?: () => void;
}

type LibraryType = keyof typeof CONTENT_LIBRARY_TYPES;

export function SaveToLibraryDialog({
  open,
  onOpenChange,
  initialContent = "",
  contentPillars = [],
  onSaved,
}: SaveToLibraryDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);
  const [type, setType] = useState<LibraryType>("snippet");
  const [pillar, setPillar] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Reset form when dialog opens with new content
  function handleOpenChange(value: boolean) {
    if (value) {
      setContent(initialContent);
      setTitle("");
      setType("snippet");
      setPillar("");
    }
    onOpenChange(value);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("content_library").insert({
      user_id: user.id,
      type,
      title: title.trim(),
      content: content.trim(),
      content_pillar: pillar || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to save to library");
      return;
    }

    toast.success("Saved to library!");
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Save to Content Library</DialogTitle>
          <DialogDescription>
            Save this content for reuse in future posts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CONTENT_LIBRARY_TYPES) as LibraryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    type === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-hover-highlight"
                  }`}
                >
                  {CONTENT_LIBRARY_TYPES[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="lib-title" className="text-sm font-medium">Title</Label>
            <Input
              id="lib-title"
              placeholder="e.g., Strong opening hook about AI"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="lib-content" className="text-sm font-medium">Content</Label>
            <textarea
              id="lib-content"
              rows={4}
              placeholder="The content to save..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Content Pillar */}
          {contentPillars.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Content Pillar <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {contentPillars.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPillar(pillar === p ? "" : p)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      pillar === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-hover-highlight"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
            {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            {saving ? "Saving..." : "Save to Library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
