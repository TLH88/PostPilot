import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { OnboardingGuard } from "@/components/layout/onboarding-guard";
import { PastDueChecker } from "@/components/past-due-checker";
import { LinkedInTokenValidator } from "@/components/linkedin/token-validator";
import { ReleaseNotesModal } from "@/components/layout/release-notes-modal";
import { LinkedInStatusBanner } from "@/components/layout/linkedin-status-banner";
import { HelpSidebarProvider } from "@/components/help-sidebar";
import { TutorialBridge } from "@/components/tutorial-bridge";
import { TrialExpiryChecker } from "@/components/trial-expiry-checker";
import { DevFlagsApplier } from "@/components/dev-flags-applier";
import type { SubscriptionTier } from "@/lib/constants";

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

  // Check onboarding status and get user name
  // BP-099: also fetch ui_mode so the TopBar's view toggle reflects the
  // user's current preference (focus vs standard).
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "onboarding_completed, full_name, subscription_tier, deleted_at, ui_mode"
    )
    .eq("user_id", user.id)
    .single();

  // BP-131: defense-in-depth — if the account is soft-deleted, never render
  // app content for them. The auth.users ban blocks new logins; this catches
  // the in-flight session that was already authenticated when the delete
  // fired (admin-initiated case) or any race on self-delete.
  if (profile?.deleted_at) {
    redirect("/goodbye");
  }

  const onboardingCompleted = profile?.onboarding_completed ?? false;
  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const userTier = (profile?.subscription_tier as SubscriptionTier) ?? "free";
  // BP-099: fall back to 'standard' if the column somehow returns null (it's
  // NOT NULL in the DB, but staying defensive keeps the toggle from rendering
  // an undefined state if a future schema change loosens the constraint).
  const uiMode: "focus" | "standard" =
    profile?.ui_mode === "focus" ? "focus" : "standard";

  return (
    <HelpSidebarProvider>
      <TutorialBridge userId={user.id}>
      <div className="relative min-h-screen bg-background">
        <DevFlagsApplier />
        <OnboardingGuard onboardingCompleted={onboardingCompleted} />
        <PastDueChecker />
        <TrialExpiryChecker />
        <LinkedInTokenValidator />
        <ReleaseNotesModal />
        {/* Sidebar - hidden on mobile */}
        <Sidebar userName={userName} userTier={userTier} />

        {/* Main content area */}
        <div className="lg:pl-64">
          <TopBar userName={userName} userTier={userTier} uiMode={uiMode} />
          <main className="min-h-[calc(100vh-3.5rem)] p-4 lg:p-6">
            <LinkedInStatusBanner />
            {children}
          </main>
        </div>
      </div>
      </TutorialBridge>
    </HelpSidebarProvider>
  );
}
