"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { EmailTemplate, SenderKey } from "@/lib/email/settings-types";

const SENDER_OPTIONS: { key: SenderKey; label: string }[] = [
  { key: "support", label: "Support" },
  { key: "hello", label: "Hello" },
  { key: "news", label: "News" },
  { key: "noreply", label: "Noreply" },
];

interface EditingTemplate extends Partial<EmailTemplate> {
  // For new templates, the key field is freeform; for system templates
  // the input is read-only.
}

export function TemplatesTab() {
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/email-settings/templates");
    if (res.ok) {
      const data = await res.json();
      setItems(data.templates ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!editing) return;
    const subject = (editing.subject ?? "").trim();
    const bodyHtml = editing.body_html ?? "";
    const name = (editing.name ?? "").trim();

    if (!subject || !name || !bodyHtml.trim() || bodyHtml.replace(/<[^>]+>/g, "").trim() === "") {
      toast.error("Name, subject, and body are required");
      return;
    }

    const isUpdate = !!editing.id;
    if (!isUpdate) {
      const key = (editing.key ?? "").trim();
      if (!key || !/^[a-z0-9_-]+$/i.test(key)) {
        toast.error("Key must be alphanumeric (with _ or -)");
        return;
      }
    }

    setSaving(true);
    try {
      const url = isUpdate
        ? `/api/admin/email-settings/templates/${editing.id}`
        : "/api/admin/email-settings/templates";
      const body = isUpdate
        ? {
            name,
            description: editing.description ?? null,
            subject,
            body_html: bodyHtml,
            sender_key: editing.sender_key ?? "support",
            show_logo: editing.show_logo ?? true,
          }
        : {
            key: editing.key,
            name,
            description: editing.description ?? null,
            subject,
            body_html: bodyHtml,
            sender_key: editing.sender_key ?? "support",
            show_logo: editing.show_logo ?? true,
          };

      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Save failed (HTTP ${res.status})`);
        return;
      }
      toast.success(isUpdate ? "Template updated" : "Template created");
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: EmailTemplate) {
    if (t.is_system) {
      toast.error("System templates can't be deleted — edit instead");
      return;
    }
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const res = await fetch(`/api/admin/email-settings/templates/${t.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Template deleted");
    load();
  }

  const senderLabel = (k: SenderKey) =>
    SENDER_OPTIONS.find((s) => s.key === k)?.label ?? k;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground max-w-2xl">
          System templates are used by automated emails (Welcome, Trial expiry, etc.). They can be
          edited but not deleted. Custom templates can be created as composer presets.
        </p>
        <Button size="sm" onClick={() => setEditing({ key: "", name: "", subject: "", body_html: "<p></p>", sender_key: "support", show_logo: true })}>
          <Plus className="size-3.5 mr-1.5" />
          Add template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          No templates.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{t.name}</p>
                  {t.is_system && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      <Lock className="size-2.5" /> System
                    </span>
                  )}
                  <Badge variant="outline" className="text-[9px] font-mono">{t.key}</Badge>
                  <Badge variant="secondary" className="text-[9px]">{senderLabel(t.sender_key)}</Badge>
                </div>
                <p className="mt-0.5 text-xs font-medium text-foreground/80 truncate">{t.subject}</p>
                {t.description && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(t)} aria-label="Edit">
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(t)}
                  disabled={t.is_system}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                  aria-label={t.is_system ? "System template — cannot delete" : "Delete"}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit template" : "Add template"}
              {editing?.is_system && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300 align-middle">
                  <Lock className="size-2.5" /> System
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {editing?.is_system
                ? "This template is used by automated emails. Editing the content updates what users see going forward."
                : "Create a reusable template — admin can load it into the composer as a preset."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name" className="text-xs">Name</Label>
                <Input
                  id="tpl-name"
                  value={editing?.name ?? ""}
                  onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                  placeholder="e.g. Welcome"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-key" className="text-xs">
                  Key {editing?.is_system && <span className="text-muted-foreground">(locked — used by automation)</span>}
                </Label>
                <Input
                  id="tpl-key"
                  value={editing?.key ?? ""}
                  onChange={(e) => setEditing({ ...editing!, key: e.target.value })}
                  placeholder="welcome"
                  maxLength={100}
                  disabled={!!editing?.id}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc" className="text-xs">Description (optional)</Label>
              <Textarea
                id="tpl-desc"
                value={editing?.description ?? ""}
                onChange={(e) => setEditing({ ...editing!, description: e.target.value })}
                placeholder="When does this email fire? Who sees it?"
                rows={2}
                maxLength={1000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-subject" className="text-xs">Subject</Label>
              <Input
                id="tpl-subject"
                value={editing?.subject ?? ""}
                onChange={(e) => setEditing({ ...editing!, subject: e.target.value })}
                placeholder="Subject line — use {firstName}, {month}, etc. as placeholders"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Sender</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="outline" className="w-full justify-between font-normal" />}
                  >
                    {senderLabel(editing?.sender_key ?? "support")}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Sender address</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {SENDER_OPTIONS.map((s) => (
                        <DropdownMenuItem
                          key={s.key}
                          onClick={() => setEditing({ ...editing!, sender_key: s.key })}
                        >
                          {s.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={editing?.show_logo ?? true}
                  onChange={(e) => setEditing({ ...editing!, show_logo: e.target.checked })}
                  className="size-3.5 rounded border-input accent-primary"
                />
                Show logo
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Body</Label>
              <RichTextEditor
                value={editing?.body_html ?? ""}
                onChange={(html) => setEditing({ ...editing!, body_html: html })}
                placeholder="Type the email body…"
              />
              <p className="text-[10px] text-muted-foreground">
                Placeholders like <code>{"{firstName}"}</code>, <code>{"{month}"}</code>, <code>{"{trialEndDate}"}</code> are filled at send time.
              </p>
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
