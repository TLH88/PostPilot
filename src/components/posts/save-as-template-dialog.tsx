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
import { toast } from "sonner";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  contentPillar?: string | null;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  content,
  contentPillar,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  function handleOpenChange(value: boolean) {
    if (value) {
      setName("");
      setDescription("");
    }
    onOpenChange(value);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("post_templates").insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      structure: content,
      content_pillars: contentPillar ? [contentPillar] : [],
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to save template");
      return;
    }

    toast.success("Template saved!");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ maxWidth: "600px" }}>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this post structure as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name" className="text-sm font-medium">Template Name</Label>
            <Input
              id="tpl-name"
              placeholder="e.g., My Story Framework"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc" className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="tpl-desc"
              placeholder="Brief description of when to use this template"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Preview — scrollable, shows full content */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Content Preview</Label>
            <div className="rounded-md border bg-muted/30 p-3 overflow-y-auto" style={{ maxHeight: "200px" }}>
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-muted-foreground">
                {content}
              </pre>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
