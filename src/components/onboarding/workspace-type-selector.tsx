"use client";

import { useRouter } from "next/navigation";
import { User, Building2, Check, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TEAM_FEATURES_ENABLED } from "@/lib/feature-flags";

interface WorkspaceTypeSelectorProps {
  onContinue?: (type: "individual" | "brand") => void;
}

/**
 * BP-023: Initial workspace type selector shown at the start of onboarding.
 * Individual → standard onboarding flow
 * Brand/Team → workspace setup wizard (requires Team tier)
 *
 * BP-098: When the master Team-features flag is off, the Brand/Team option is
 * hidden entirely and the user is auto-routed to the individual flow on mount.
 * This keeps onboarding linear for the Free→Pro audience.
 */
export function WorkspaceTypeSelector({ onContinue }: WorkspaceTypeSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<"individual" | "brand" | null>(null);

  // Auto-skip the selector when Team features are disabled.
  useEffect(() => {
    if (!TEAM_FEATURES_ENABLED) {
      if (onContinue) {
        onContinue("individual");
      } else {
        router.replace("/onboarding?type=individual");
      }
    }
  }, [onContinue, router]);

  function handleContinue() {
    if (!selected) return;
    if (onContinue) {
      onContinue(selected);
      return;
    }
    // Default routing
    if (selected === "brand") {
      router.push("/workspace/setup");
    } else {
      // Continue with the standard onboarding (user stays on current page)
      router.push("/onboarding?type=individual");
    }
  }

  // While the redirect effect runs, render nothing (avoids flash of the
  // selector before the user is rerouted to the individual onboarding flow).
  if (!TEAM_FEATURES_ENABLED) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to PostPilot</h1>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          Let&apos;s get you set up. First, are you creating content for yourself or for a brand/team?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Individual Creator */}
        <Card
          onClick={() => setSelected("individual")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selected === "individual" && "ring-2 ring-primary shadow-md"
          )}
        >
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-500/10">
                <User className="size-6 text-blue-500" />
              </div>
              {selected === "individual" && (
                <div className="flex size-6 items-center justify-center rounded-full bg-primary">
                  <Check className="size-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Individual Creator</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                I&apos;m building my personal brand on LinkedIn.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" />
                Personal voice & expertise
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" />
                Content pillars & writing style
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" />
                Solo publishing workflow
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Brand/Team */}
        <Card
          onClick={() => setSelected("brand")}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md relative",
            selected === "brand" && "ring-2 ring-primary shadow-md"
          )}
        >
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-full bg-purple-500/10">
                <Building2 className="size-6 text-purple-500" />
              </div>
              {selected === "brand" && (
                <div className="flex size-6 items-center justify-center rounded-full bg-primary">
                  <Check className="size-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Brand / Team</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re building content for a brand with multiple contributors.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" />
                Brand voice & guidelines
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" />
                Multi-user workspace
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" />
                Approval workflows & roles
              </li>
            </ul>
            <div className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
              Requires Team plan
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!selected}
          onClick={handleContinue}
          className="gap-1.5"
        >
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
