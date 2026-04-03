"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ClipboardCopy,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { SaveToLibraryDialog } from "@/components/library/save-to-library-dialog";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_LIBRARY_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import type { ContentLibraryItem } from "@/types";

type LibraryType = keyof typeof CONTENT_LIBRARY_TYPES | "all";

export default function LibraryPage() {
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LibraryType>("all");
  const [search, setSearch] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [contentPillars, setContentPillars] = useState<string[]>([]);

  const supabase = createClient();

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch user's items + built-in items
    const { data } = await supabase
      .from("content_library")
      .select("*")
      .or(`user_id.eq.${user.id},is_builtin.eq.true`)
      .order("is_builtin", { ascending: true })
      .order("updated_at", { ascending: false });

    setItems(data ?? []);

    // Fetch pillars for the save dialog
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("content_pillars")
      .eq("user_id", user.id)
      .single();

    if (profile?.content_pillars) {
      setContentPillars(profile.content_pillars);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete(id: string) {
    await supabase.from("content_library").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted from library");
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      // Fallback for non-HTTPS or denied clipboard permission
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Copied to clipboard");
    }
  }

  const query = search.toLowerCase();
  const filtered = items.filter((item) => {
    const matchesType = filter === "all" || item.type === filter;
    const matchesSearch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      item.content_pillar?.toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const typeCounts = {
    all: items.length,
    hook: items.filter((i) => i.type === "hook").length,
    cta: items.filter((i) => i.type === "cta").length,
    closing: items.filter((i) => i.type === "closing").length,
    snippet: items.filter((i) => i.type === "snippet").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground">
            Save and reuse your best hooks, CTAs, closings, and snippets.
          </p>
        </div>
        <Button onClick={() => setSaveDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add to Library
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          {(["all", "hook", "cta", "closing", "snippet"] as LibraryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filter === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : CONTENT_LIBRARY_TYPES[t].label} ({typeCounts[t]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search library..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <BookOpen className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {items.length === 0 ? "Your library is empty" : "No items match your search"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? "Start saving your best hooks, CTAs, and snippets for easy reuse."
              : "Try a different search or filter."}
          </p>
          {items.length === 0 && (
            <Button onClick={() => setSaveDialogOpen(true)} className="mt-6 gap-2">
              <Plus className="size-4" />
              Save Your First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardContent className="flex-1 space-y-2 pt-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${
                      CONTENT_LIBRARY_TYPES[item.type]?.color ?? ""
                    }`}
                  >
                    {CONTENT_LIBRARY_TYPES[item.type]?.label ?? item.type}
                  </Badge>
                  {item.is_builtin && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700">
                      Example
                    </Badge>
                  )}
                  {item.content_pillar && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.content_pillar}
                    </Badge>
                  )}
                  {item.usage_count > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Used {item.usage_count}x
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {item.content}
                </p>
              </CardContent>
              <CardFooter className="gap-2 pt-0">
                <Button
                  variant="ghost"
                  size="xs"
                  className="gap-1"
                  onClick={() => handleCopy(item.content)}
                >
                  <ClipboardCopy className="size-3" />
                  Copy
                </Button>
                {!item.is_builtin && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Save dialog */}
      <SaveToLibraryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        contentPillars={contentPillars}
        onSaved={loadItems}
      />
    </div>
  );
}
