"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles, Bug, Map, Rocket, AlertTriangle } from "lucide-react";
import type { ReleaseNote } from "@/types";

interface ReleaseNotesContentProps {
  note: ReleaseNote;
}

/**
 * Shared rendering for release note content.
 * Used by: ReleaseNotesModal (user-facing), admin preview, settings viewer.
 *
 * Each section sits in its own colored panel so they read as distinct
 * blocks rather than blending together. Color family matches the admin
 * editor: amber=features, green=fixes, red=known issues, blue=roadmap.
 */
export function ReleaseNotesContent({ note }: ReleaseNotesContentProps) {
  const features = note.features ?? [];
  const bugFixes = note.bug_fixes ?? [];
  const knownIssues = note.known_issues ?? [];
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

      {/* New Features — amber panel */}
      {features.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <Sparkles className="size-4" />
            New Features
          </div>
          <div className="space-y-2">
            {features.map((feature, i) => (
              <div
                key={i}
                className="rounded-md border border-amber-200/70 dark:border-amber-900/40 bg-background/60 p-3 space-y-1"
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

      {/* Bug Fixes — green panel */}
      {bugFixes.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50/60 dark:border-green-900/60 dark:bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
            <Bug className="size-4" />
            Bug Fixes
          </div>
          <div className="space-y-2">
            {bugFixes.map((fix, i) => (
              <div
                key={i}
                className="rounded-md border border-green-200/70 dark:border-green-900/40 bg-background/60 p-3 space-y-1"
              >
                <p className="text-sm font-medium">{fix.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fix.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Known Issues — red panel */}
      {knownIssues.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="size-4" />
            Known Issues
          </div>
          <div className="space-y-2">
            {knownIssues.map((issue, i) => (
              <div
                key={i}
                className="rounded-md border border-red-200/70 dark:border-red-900/40 bg-background/60 p-3 space-y-1"
              >
                <p className="text-sm font-medium">{issue.title}</p>
                <p className="text-xs text-muted-foreground">
                  {issue.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap — blue dashed panel */}
      {roadmap.length > 0 && (
        <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Map className="size-4" />
            Coming Soon
          </div>
          <div className="space-y-2">
            {roadmap.map((item, i) => (
              <div
                key={i}
                className="rounded-md border border-blue-200/70 dark:border-blue-900/40 bg-background/60 p-3 space-y-1"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
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
