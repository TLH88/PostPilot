import { redirect } from "next/navigation";
import { TEAM_FEATURES_ENABLED } from "@/lib/feature-flags";
import { WorkspaceTypeSelector } from "@/components/onboarding/workspace-type-selector";

/**
 * BP-150 / UF-013: Server-side redirect when Team features are disabled.
 *
 * Pre-fix: this was a client component that mounted, ran a useEffect, and
 * `router.replace`d to `/onboarding?type=individual` — producing a 1-2s
 * blank flash before the redirect landed.
 *
 * With Team features off (the production default per BP-098), the redirect
 * now happens server-side before any HTML is sent to the client. With Team
 * features on, the WorkspaceTypeSelector renders normally so users can pick
 * Individual vs Brand/Team.
 */
export default function OnboardingTypePage() {
  if (!TEAM_FEATURES_ENABLED) {
    redirect("/onboarding?type=individual");
  }

  return (
    <div className="py-8">
      <WorkspaceTypeSelector />
    </div>
  );
}
