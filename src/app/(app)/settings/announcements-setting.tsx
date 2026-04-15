"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { ReleaseNotesModal } from "@/components/layout/release-notes-modal";

export function AnnouncementsSetting() {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <>
      <p className="text-sm text-muted-foreground">
        View release notes and announcements about new features, improvements, and upcoming changes.
      </p>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setShowNotes(true)}
      >
        <Megaphone className="size-4" />
        View Release Notes
      </Button>

      {showNotes && (
        <ReleaseNotesModal
          externalOpen={showNotes}
          onExternalClose={() => setShowNotes(false)}
        />
      )}
    </>
  );
}
