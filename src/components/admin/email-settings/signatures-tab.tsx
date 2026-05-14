"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import parse from "html-react-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmailSignature } from "@/lib/email/settings-types";

export function SignaturesTab() {
  const [items, setItems] = useState<EmailSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EmailSignature> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/email-settings/signatures");
    if (res.ok) {
      const data = await res.json();
      setItems(data.signatures ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!editing) return;
    const name = (editing.name ?? "").trim();
    const content = editing.content ?? "";
    if (!name || !content.trim() || content.replace(/<[^>]+>/g, "").trim() === "") {
      toast.error("Name and content are required");
      return;
    }

    setSaving(true);
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate
        ? `/api/admin/email-settings/signatures/${editing.id}`
        : "/api/admin/email-settings/signatures";
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          content,
          is_default: editing.is_default ?? false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Save failed (HTTP ${res.status})`);
        return;
      }
      toast.success(isUpdate ? "Signature updated" : "Signature created");
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this signature?")) return;
    const res = await fetch(`/api/admin/email-settings/signatures/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Signature deleted");
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Closing lines that appear above the email footer. Rich-text formatting supported.
        </p>
        <Button size="sm" onClick={() => setEditing({ name: "", content: "<p>— The PostPilot Team</p>", is_default: false })}>
          <Plus className="size-3.5 mr-1.5" />
          Add signature
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          No signatures yet. Add one to get started.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.is_default && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      <Star className="size-2.5 fill-current" /> Default
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2 [&_p]:m-0">
                  {parse(s.content)}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label="Edit">
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(s.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit signature" : "Add signature"}</DialogTitle>
            <DialogDescription>
              Shown at the end of the message body, before the footer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signature-name" className="text-xs">Name</Label>
              <Input
                id="signature-name"
                value={editing?.name ?? ""}
                onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                placeholder="e.g. Team"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content</Label>
              <RichTextEditor
                value={editing?.content ?? ""}
                onChange={(html) => setEditing({ ...editing!, content: html })}
                placeholder="— The PostPilot Team"
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={!!editing?.is_default}
                onChange={(e) => setEditing({ ...editing!, is_default: e.target.checked })}
                className="size-3.5 rounded border-input accent-primary"
              />
              Use this as the default signature
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
