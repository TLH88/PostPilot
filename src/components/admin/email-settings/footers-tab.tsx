"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import parse from "html-react-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmailFooter, FooterKind } from "@/lib/email/settings-types";

const KIND_OPTIONS: { value: FooterKind; label: string; color: string }[] = [
  { value: "unsubscribe", label: "Unsubscribe", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "gdpr", label: "GDPR", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { value: "governance", label: "Governance", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { value: "noreply_notice", label: "No-reply notice", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "custom", label: "Custom", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

export function FootersTab() {
  const [items, setItems] = useState<EmailFooter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EmailFooter> | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/email-settings/footers");
    if (res.ok) {
      const data = await res.json();
      setItems(data.footers ?? []);
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
        ? `/api/admin/email-settings/footers/${editing.id}`
        : "/api/admin/email-settings/footers";
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          content,
          kind: editing.kind ?? "custom",
          sort_order: editing.sort_order ?? 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Save failed (HTTP ${res.status})`);
        return;
      }
      toast.success(isUpdate ? "Footer updated" : "Footer created");
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this footer?")) return;
    const res = await fetch(`/api/admin/email-settings/footers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Footer deleted");
    load();
  }

  const editingKindMeta = KIND_OPTIONS.find((k) => k.value === (editing?.kind ?? "custom"));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Footer blocks shown below signatures. Multiple footers can be attached per email (e.g. unsubscribe + GDPR).
        </p>
        <Button size="sm" onClick={() => setEditing({ name: "", content: "", kind: "custom", sort_order: 0 })}>
          <Plus className="size-3.5 mr-1.5" />
          Add footer
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          No footers yet. Add one to get started.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((f) => {
            const kindMeta = KIND_OPTIONS.find((k) => k.value === f.kind);
            return (
              <li key={f.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{f.name}</p>
                    {kindMeta && (
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${kindMeta.color}`}>
                        {kindMeta.label}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[9px]">
                      sort {f.sort_order}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2 [&_p]:m-0 [&_a]:underline">
                    {parse(f.content)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(f)} aria-label="Edit">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(f.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit footer" : "Add footer"}</DialogTitle>
            <DialogDescription>
              Footers render below the signature. Sort order controls stacking when multiple are attached.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="footer-name" className="text-xs">Name</Label>
                <Input
                  id="footer-name"
                  value={editing?.name ?? ""}
                  onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                  placeholder="e.g. Unsubscribe link"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kind</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="outline" className="w-full justify-between font-normal" />}
                  >
                    {editingKindMeta?.label ?? "Custom"}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Footer kind</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {KIND_OPTIONS.map((k) => (
                        <DropdownMenuItem
                          key={k.value}
                          onClick={() => setEditing({ ...editing!, kind: k.value })}
                          className={editing?.kind === k.value ? "bg-accent font-semibold" : ""}
                        >
                          {k.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="footer-sort" className="text-xs">Sort order (lower = higher)</Label>
              <Input
                id="footer-sort"
                type="number"
                value={editing?.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing!, sort_order: Number(e.target.value) })}
                min={0}
                max={9999}
                className="max-w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content</Label>
              <RichTextEditor
                value={editing?.content ?? ""}
                onChange={(html) => setEditing({ ...editing!, content: html })}
                placeholder="Type your footer text — link tokens like {unsubscribeUrl} are replaced at send time."
              />
            </div>
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
