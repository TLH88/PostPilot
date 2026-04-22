"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, Info } from "lucide-react";
import {
  DEV_FLAGS,
  type DevFlag,
  readDevFlags,
  writeDevFlags,
} from "@/lib/dev-flags";

/**
 * /admin/dev-tools — admin-only page for diagnostic flag toggles.
 *
 * BP-035 / Phase B. Admin gating is inherited from /admin/layout.tsx
 * (verifyAdmin() check), so anyone reaching this page is already an admin.
 *
 * Each flag in DEV_FLAGS renders as a self-documenting card with:
 *   - Toggle switch (current state)
 *   - Human-readable name
 *   - What it does
 *   - Default state (informational — runtime always defaults to OFF)
 *   - When to use it
 *   - Where it applies (browser / server / both)
 *
 * Toggle states persist in localStorage. The DevFlagsApplier mounted in
 * (app)/layout.tsx reads them on app boot and writes the corresponding
 * `window.<varName>` for consumer code to read.
 */
export default function AdminDevToolsPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFlags(readDevFlags());
    setLoaded(true);
  }, []);

  function toggle(id: string) {
    const next = { ...flags, [id]: !flags[id] };
    setFlags(next);
    writeDevFlags(next);
  }

  const anyEnabled = Object.values(flags).some((v) => v === true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wrench className="size-5 text-primary" />
          Developer Tools
        </h1>
        <p className="mt-1 text-muted-foreground">
          Diagnostic toggles for investigating user-reported bugs. These flags
          are admin-only and persist in your browser&apos;s local storage.
        </p>
      </div>

      {/* Heads-up banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium">These tools are for diagnosis only.</p>
            <p className="text-xs">
              Every flag defaults to <strong>off</strong> on every browser. They
              do not change product functionality — they only enable extra
              console logging or test behavior. Turn them off when you&apos;re
              done; they only apply to <em>your</em> browser, but verbose
              logging will slow page interactions.
            </p>
          </div>
        </div>
      </div>

      {/* Active flag count */}
      {loaded && anyEnabled && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm">
          <span className="font-medium">
            {Object.values(flags).filter(Boolean).length} flag(s) currently
            enabled in this browser.
          </span>
        </div>
      )}

      {/* Flag list */}
      <div className="space-y-4">
        {DEV_FLAGS.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No diagnostic flags are currently registered.
            </CardContent>
          </Card>
        ) : (
          DEV_FLAGS.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              enabled={flags[flag.id] === true}
              loaded={loaded}
              onToggle={() => toggle(flag.id)}
            />
          ))
        )}
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="size-4" />
            How developer flags work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            Each flag has a corresponding <code>window.&lt;variableName&gt;</code>{" "}
            global. When you toggle a flag on, that global is set to{" "}
            <code>true</code> on every page in this browser. Code that reads the
            global (e.g. the Tutorial SDK&apos;s debug logger) starts behaving
            differently.
          </p>
          <p>
            Flag states are saved to your browser&apos;s local storage under the
            key <code>postpilot_dev_flags</code>. They persist across page
            reloads but are tied to this browser only — flipping a flag here
            will not affect any other user, including yourself signed in
            elsewhere.
          </p>
          <p>
            To add a new diagnostic flag, edit{" "}
            <code>src/lib/dev-flags.ts</code> and add an entry to the{" "}
            <code>DEV_FLAGS</code> array. It will appear here automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface FlagCardProps {
  flag: DevFlag;
  enabled: boolean;
  loaded: boolean;
  onToggle: () => void;
}

function FlagCard({ flag, enabled, loaded, onToggle }: FlagCardProps) {
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        {/* Header row: toggle + name + scope badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{flag.name}</h3>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {flag.appliesTo}
              </Badge>
              {!flag.defaultState && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  Default: off
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {flag.description}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1 shrink-0">
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              disabled={!loaded}
              aria-label={`Toggle ${flag.name}`}
            />
            <span className="text-xs font-medium tabular-nums w-7">
              {enabled ? "On" : "Off"}
            </span>
          </div>
        </div>

        {/* When-to-use note */}
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            When to use
          </p>
          <p className="text-xs leading-relaxed">{flag.whenToUse}</p>
        </div>

        {/* Technical reference */}
        <div className="text-[10px] text-muted-foreground font-mono">
          window.{flag.windowVar} · id: {flag.id}
        </div>
      </CardContent>
    </Card>
  );
}
