"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ReleaseNotesContent } from "@/components/layout/release-notes-content";
import type { ReleaseNote } from "@/types";

interface ReleaseNotesModalProps {
  /** If true, opens the modal externally (e.g., from Settings) */
  externalOpen?: boolean;
  /** Callback when externally-opened modal closes */
  onExternalClose?: () => void;
}

export function ReleaseNotesModal({
  externalOpen,
  onExternalClose,
}: ReleaseNotesModalProps = {}) {
  const [allNotes, setAllNotes] = useState<ReleaseNote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const hasCheckedRef = useRef(false);
  const supabase = createClient();

  // Fetch all published notes (newest first by version, then by published date)
  async function fetchAllNotes() {
    const { data } = await supabase
      .from("release_notes")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    const notes = (data ?? []) as ReleaseNote[];
    // Sort by version descending (semantic: higher version = newer)
    notes.sort((a, b) => {
      const aParts = a.version.split(".").map(Number);
      const bParts = b.version.split(".").map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const diff = (bParts[i] ?? 0) - (aParts[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    setAllNotes(notes);
    return notes;
  }

  // Auto-open for unread notes on mount (once)
  useEffect(() => {
    if (hasCheckedRef.current || externalOpen) return;
    hasCheckedRef.current = true;

    async function checkUnread() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const notes = await fetchAllNotes();
      if (notes.length === 0) return;

      const { data: readRecords } = await supabase
        .from("user_release_notes_read")
        .select("release_note_id")
        .eq("user_id", user.id);

      const readIds = (readRecords ?? []).map((r) => r.release_note_id);

      if (!readIds.includes(notes[0].id)) {
        setCurrentIndex(0);
        setAutoOpened(true);
        setOpen(true);
      }
    }

    checkUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle external open (from Settings)
  useEffect(() => {
    if (!externalOpen) return;

    fetchAllNotes().then((notes) => {
      if (notes.length > 0) {
        setCurrentIndex(0); // Always start at newest
        setAutoOpened(false);
        setOpen(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalOpen]);

  async function handleDismiss() {
    const currentNote = allNotes[currentIndex];
    if (currentNote && autoOpened) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_release_notes_read").upsert(
          { user_id: user.id, release_note_id: currentNote.id },
          { onConflict: "user_id,release_note_id" }
        );
      }
    }

    setOpen(false);
    setAutoOpened(false);
    onExternalClose?.();
  }

  const currentNote = allNotes[currentIndex];
  if (!open || !currentNote) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) handleDismiss(); }}>
      <DialogContent style={{ maxWidth: "600px" }} className="max-h-[85vh] flex flex-col overflow-hidden">
        {/* Version pills */}
        {allNotes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
            <span className="text-xs font-medium text-muted-foreground mr-1">Version:</span>
            {allNotes.map((note, i) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  i === currentIndex
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                v{note.version}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 min-h-0">
          <ReleaseNotesContent note={currentNote} />
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
