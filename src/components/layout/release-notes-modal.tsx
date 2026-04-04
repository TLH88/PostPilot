"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Bug, Rocket, Map, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReleaseNote } from "@/types";

export function ReleaseNotesModal() {
  const [releaseNote, setReleaseNote] = useState<ReleaseNote | null>(null);
  const [open, setOpen] = useState(false);

  const supabase = createClient();

  const checkUnread = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get IDs of release notes the user has already read
    const { data: readRecords } = await supabase
      .from("user_release_notes_read")
      .select("release_note_id")
      .eq("user_id", user.id);

    const readIds = (readRecords ?? []).map((r) => r.release_note_id);

    // Get the latest published release note
    const { data: notes } = await supabase
      .from("release_notes")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(1);

    if (notes && notes.length > 0 && !readIds.includes(notes[0].id)) {
      setReleaseNote(notes[0]);
      setOpen(true);
    }
  }, [supabase]);

  useEffect(() => {
    checkUnread();
  }, [checkUnread]);

  async function handleDismiss() {
    if (!releaseNote) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_release_notes_read").upsert(
      {
        user_id: user.id,
        release_note_id: releaseNote.id,
      },
      { onConflict: "user_id,release_note_id" }
    );

    if (error) {
      console.error("Failed to mark release note as read:", error);
    }

    setOpen(false);
    setReleaseNote(null);
  }

  if (!releaseNote) return null;

  const features = releaseNote.features ?? [];
  const bugFixes = releaseNote.bug_fixes ?? [];
  const roadmap = releaseNote.roadmap ?? [];

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) handleDismiss(); }}>
      <DialogContent style={{ maxWidth: "600px" }} className="max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Rocket className="size-5 text-blue-500" />
            <DialogTitle className="text-lg">What&apos;s New</DialogTitle>
            <Badge variant="secondary" className="text-xs">
              v{releaseNote.version}
            </Badge>
          </div>
          <DialogDescription className="pt-1">
            {releaseNote.title}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {releaseNote.description}
        </p>

        {features.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-amber-500" />
              New Features
            </div>
            <div className="space-y-2">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-muted/50 p-3 space-y-1"
                >
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {bugFixes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bug className="size-4 text-green-500" />
                Bug Fixes
              </div>
              <div className="space-y-2">
                {bugFixes.map((fix, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-muted/50 p-3 space-y-1"
                  >
                    <p className="text-sm font-medium">{fix.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {fix.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {roadmap.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Map className="size-4 text-blue-500" />
                Coming Soon
              </div>
              <div className="space-y-2">
                {roadmap.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-3 space-y-1"
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        </div>

        <DialogFooter>
          <Button
            onClick={handleDismiss}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          >
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
