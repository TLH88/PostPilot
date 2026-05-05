import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { OnboardingGuard } from "@/components/layout/onboarding-guard";
import { PastDueChecker } from "@/components/past-due-checker";
import { LinkedInTokenValidator } from "@/components/linkedin/token-validator";
import { ReleaseNotesModal } from "@/components/layout/release-notes-modal";
import { LinkedInStatusBanner } from "@/components/layout/linkedin-status-banner";
import { PausedBanner } from "@/components/budget/paused-banner";
import { PausedModal } from "@/components/budget/paused-modal";
import { AdBlockerGate } from "@/components/ads/ad-blocker-gate";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { ThemePersistence } from "@/components/theme-persistence";
import { HelpSidebarProvider } from "@/components/help-sidebar";
import { TutorialBridge } from "@/components/tutorial-bridge";
import { TrialExpiryChecker } from "@/components/trial-expiry-checker";
import { DevFlagsApplier } from "@/components/dev-flags-applier";
import type { SubscriptionTier } from "@/lib/constants";
import { validateOnboardingComplete } from "@/lib/onboarding/validate";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // BP-142: Check onboarding status, integrity, and get user name. The
  // integrity check (validateOnboardingComplete) covers the case where a
  // future schema change adds a required field that older accounts haven't
  // filled — those users get redirected back to onboarding to complete the
  // missing fields, even if `onboarding_completed=true`.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "onboarding_completed, full_name, subscription_tier, deleted_at, expertise_areas, industries, theme_preference"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // BP-131: defense-in-depth — if the account is soft-deleted, never render
  // app content for them. The auth.users ban blocks new logins; this catches
  // the in-flight session that was already authenticated when the delete
  // fired (admin-initiated case) or any race on self-delete.
  if (profile?.deleted_at) {
    redirect("/goodbye");
  }

  const onboardingCompleted = profile?.onboarding_completed ?? false;
  const integrity = validateOnboardingComplete(profile);
  const onboardingOk = onboardingCompleted && integrity.ok;
  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const userTier = (profile?.subscription_tier as SubscriptionTier) ?? "free";

  // BP-085 P3: budget paused-state UX. ai_budget_thresholds row only
  // exists when an admin has set a threshold for this user; the LEFT-JOIN-
  // shaped query returns null for users with no row, which we treat as
  // unlimited / never paused. Read via the user-scoped client so RLS gates
  // the row to its owner.
  const { data: budget } = await supabase
    .from("ai_budget_thresholds")
    .select("is_paused, paused_at, paused_reason")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPaused = budget?.is_paused ?? false;
  const pausedAt = budget?.paused_at ?? null;
  const pausedReason = budget?.paused_reason ?? null;

  // BP-045: ad-blocker hard-gate applies only to ad-supported tiers
  // (Free + Personal). Pro / Team / Enterprise are ad-free and never
  // see the gate. We pass the determination to the gate component as
  // a prop so the detection runs only when we actually need it.
  const adSupportedTier = userTier === "free" || userTier === "personal";

  // Cross-device theme persistence — null when the user hasn't picked
  // a theme yet (falls back to the app default of "dark").
  const themePreference =
    (profile?.theme_preference as string | null | undefined) ?? null;

  return (
    <HelpSidebarProvider>
      <TutorialBridge userId={user.id}>
      <div className="relative min-h-screen bg-background">
        <DevFlagsApplier />
        <OnboardingGuard onboardingCompleted={onboardingOk} />
        <PastDueChecker />
        <TrialExpiryChecker />
        <LinkedInTokenValidator />
        <ReleaseNotesModal />
        <PausedModal userId={user.id} paused={isPaused} pausedAt={pausedAt} />
        {adSupportedTier && <AdBlockerGate />}
        <ThemePersistence initialTheme={themePreference} />
        {/* Sidebar - hidden on mobile */}
        <Sidebar userName={userName} userTier={userTier} />

        {/* Main content area — offset only by the collapsed rail width
            (w-16). The sidebar expands as a hover overlay above content. */}
        <div className="lg:pl-16">
          <TopBar userName={userName} userTier={userTier} />
          <main className="min-h-[calc(100vh-3.5rem)] p-4 lg:p-6">
            <ImpersonationBanner />
            <PausedBanner paused={isPaused} reason={pausedReason} />
            <LinkedInStatusBanner />
            {children}
          </main>
        </div>
      </div>
      </TutorialBridge>
    </HelpSidebarProvider>
  );
}
