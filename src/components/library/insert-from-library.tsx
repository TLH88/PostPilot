"use client";

import { useState, useEffect } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_LIBRARY_TYPES } from "@/lib/constants";
import type { ContentLibraryItem } from "@/types";

interface InsertFromLibraryProps {
  onInsert: (content: string) => void;
}

type LibraryType = keyof typeof CONTENT_LIBRARY_TYPES | "all";

export function InsertFromLibrary({ onInsert }: InsertFromLibraryProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<LibraryType>("all");
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  async function loadItems() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("content_library")
      .select("*")
      .or(`user_id.eq.${user.id},is_builtin.eq.true`)
      .order("usage_count", { ascending: false });

    setItems(data ?? []);
    setLoading(false);
  }

  async function handleInsert(item: ContentLibraryItem) {
    onInsert(item.content);
    setOpen(false);

    // Increment usage count in background
    await supabase
      .from("content_library")
      .update({ usage_count: item.usage_count + 1 })
      .eq("id", item.id);
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="xs" className="gap-1" />}
      >
        <BookOpen className="size-3" />
        Library
      </PopoverTrigger>
      <PopoverContent align="start" className="!p-0 !gap-0 w-[320px]">
        {/* Type filter tabs */}
        <div className="flex items-center gap-1 border-b px-2 py-1.5 overflow-x-auto">
          {(["all", "hook", "cta", "closing", "snippet"] as LibraryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                filter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-hover-highlight"
              }`}
            >
              {t === "all" ? "All" : CONTENT_LIBRARY_TYPES[t].label}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="overflow-y-auto" style={{ maxHeight: "280px" }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {items.length === 0
                  ? "Your library is empty"
                  : "No items match this filter"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Save hooks, CTAs, and snippets from the Library page
              </p>
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleInsert(item)}
                  className="w-full text-left rounded-md px-2.5 py-2 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium truncate flex-1">
                      {item.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`shrink-0 text-[10px] px-1.5 py-0 ${
                        CONTENT_LIBRARY_TYPES[item.type as keyof typeof CONTENT_LIBRARY_TYPES]?.color ?? ""
                      }`}
                    >
                      {CONTENT_LIBRARY_TYPES[item.type as keyof typeof CONTENT_LIBRARY_TYPES]?.label ?? item.type}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {item.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
