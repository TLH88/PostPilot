"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmailGreeting } from "@/lib/email/settings-types";

export function GreetingsTab() {
  const [items, setItems] = useState<EmailGreeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EmailGreeting> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/email-settings/greetings");
    if (res.ok) {
      const data = await res.json();
      setItems(data.greetings ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!editing) return;
    const name = (editing.name ?? "").trim();
    const content = (editing.content ?? "").trim();
    if (!name || !content) {
      toast.error("Name and content are required");
      return;
    }

    setSaving(true);
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate
        ? `/api/admin/email-settings/greetings/${editing.id}`
        : "/api/admin/email-settings/greetings";
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
      toast.success(isUpdate ? "Greeting updated" : "Greeting created");
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this greeting?")) return;
    const res = await fetch(`/api/admin/email-settings/greetings/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Greeting deleted");
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Opening lines used in emails. Use <code>{"{firstName}"}</code> as a placeholder for the recipient&apos;s first name.
        </p>
        <Button size="sm" onClick={() => setEditing({ name: "", content: "Hi {firstName},", is_default: false })}>
          <Plus className="size-3.5 mr-1.5" />
          Add greeting
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          No greetings yet. Add one to get started.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{g.name}</p>
                  {g.is_default && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      <Star className="size-2.5 fill-current" /> Default
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">{g.content}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(g)} aria-label="Edit">
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(g.id)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit greeting" : "Add greeting"}</DialogTitle>
            <DialogDescription>
              A short opening line. <code>{"{firstName}"}</code> is replaced at send time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="greeting-name" className="text-xs">Name</Label>
              <Input
                id="greeting-name"
                value={editing?.name ?? ""}
                onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                placeholder="e.g. Casual"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="greeting-content" className="text-xs">Content</Label>
              <Textarea
                id="greeting-content"
                value={editing?.content ?? ""}
                onChange={(e) => setEditing({ ...editing!, content: e.target.value })}
                placeholder="Hi {firstName},"
                rows={2}
                maxLength={500}
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={!!editing?.is_default}
                onChange={(e) => setEditing({ ...editing!, is_default: e.target.checked })}
                className="size-3.5 rounded border-input accent-primary"
              />
              Use this as the default greeting
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
