"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Bug, Map, Rocket } from "lucide-react";
import type { ReleaseNote } from "@/types";

interface ReleaseNotesContentProps {
  note: ReleaseNote;
}

/**
 * Shared rendering for release note content.
 * Used by: ReleaseNotesModal (user-facing), admin preview, settings viewer.
 */
export function ReleaseNotesContent({ note }: ReleaseNotesContentProps) {
  const features = note.features ?? [];
  const bugFixes = note.bug_fixes ?? [];
  const roadmap = note.roadmap ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Rocket className="size-5 text-blue-500" />
        <span className="text-lg font-semibold">What&apos;s New</span>
        <Badge variant="secondary" className="text-xs">
          v{note.version}
        </Badge>
      </div>
      <p className="text-sm font-medium text-foreground">{note.title}</p>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {note.description}
      </p>

      {/* Features */}
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

      {/* Bug Fixes */}
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

      {/* Roadmap */}
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

      {/* Published date */}
      {note.published_at && (
        <p className="text-[10px] text-muted-foreground text-center pt-2">
          Published {new Date(note.published_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
