"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, Loader2, Eye, EyeOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  description: string;
  features: { title: string; description: string }[];
  bug_fixes: { title: string; description: string }[];
  roadmap: { title: string; description: string }[];
  is_published: boolean;
  published_at: string | null;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReleaseNote | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Form state
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [bugFixesText, setBugFixesText] = useState("");
  const [roadmapText, setRoadmapText] = useState("");

  useEffect(() => { loadAnnouncements(); }, []);

  async function loadAnnouncements() {
    setLoading(true);
    const res = await fetch("/api/admin/announcements");
    if (!res.ok) { router.push("/"); return; }
    const data = await res.json();
    setAnnouncements(data.announcements);
    setLoading(false);
  }

  function parseItems(text: string): { title: string; description: string }[] {
    return text.split("\n").filter(Boolean).map((line) => {
      const [t, ...d] = line.split(":");
      return { title: t.trim(), description: d.join(":").trim() };
    });
  }

  function itemsToText(items: { title: string; description: string }[]): string {
    return items.map((i) => `${i.title}: ${i.description}`).join("\n");
  }

  function openCreate() {
    setEditing(null);
    setVersion("");
    setTitle("");
    setDescription("");
    setFeaturesText("");
    setBugFixesText("");
    setRoadmapText("");
    setDialogOpen(true);
  }

  function openEdit(note: ReleaseNote) {
    setEditing(note);
    setVersion(note.version);
    setTitle(note.title);
    setDescription(note.description);
    setFeaturesText(itemsToText(note.features));
    setBugFixesText(itemsToText(note.bug_fixes));
    setRoadmapText(itemsToText(note.roadmap));
    setDialogOpen(true);
  }

  async function handleSave(publish: boolean) {
    setSaving(true);
    const body = {
      ...(editing ? { id: editing.id } : {}),
      version,
      title,
      description,
      features: parseItems(featuresText),
      bug_fixes: parseItems(bugFixesText),
      roadmap: parseItems(roadmapText),
      is_published: publish,
    };

    const res = await fetch("/api/admin/announcements", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editing ? "Announcement updated" : "Announcement created");
      setDialogOpen(false);
      loadAnnouncements();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save");
    }
    setSaving(false);
  }

  async function togglePublish(note: ReleaseNote) {
    const res = await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: note.id, is_published: !note.is_published }),
    });

    if (res.ok) {
      toast.success(note.is_published ? "Unpublished" : "Published");
      loadAnnouncements();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">Manage What&apos;s New release notes shown to users.</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          New Announcement
        </Button>
      </div>

      <div className="space-y-3">
        {announcements.map((note) => (
          <Card key={note.id}>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="size-4 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{note.title}</span>
                      <Badge variant="secondary" className="text-[10px]">v{note.version}</Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${note.is_published ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-600"}`}
                      >
                        {note.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {note.features.length} features, {note.bug_fixes.length} fixes, {note.roadmap.length} roadmap
                      {note.published_at && ` — ${new Date(note.published_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openEdit(note)}>
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => togglePublish(note)}>
                    {note.is_published ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {note.is_published ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {announcements.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No announcements yet. Create one to notify users of new features.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxWidth: "640px" }} className="max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.3.0" />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feature Update Title" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of this release..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Features (one per line — Title: Description)</Label>
              <textarea
                rows={4}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder="Analytics Dashboard: Track impressions and engagement&#10;Image Generation: Generate images with AI"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bug Fixes (one per line — Title: Description)</Label>
              <textarea
                rows={3}
                value={bugFixesText}
                onChange={(e) => setBugFixesText(e.target.value)}
                placeholder="Dark Mode Fix: Hook analysis card now styled correctly"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Roadmap / Coming Soon (one per line — Title: Description)</Label>
              <textarea
                rows={3}
                value={roadmapText}
                onChange={(e) => setRoadmapText(e.target.value)}
                placeholder="Stripe Billing: Secure subscription management"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || !version || !title}>
              Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving || !version || !title} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
              {saving ? "Saving..." : "Save & Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
