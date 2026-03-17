import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { OnboardingGuard } from "@/components/layout/onboarding-guard";
import { PastDueChecker } from "@/components/past-due-checker";
import { ReleaseNotesModal } from "@/components/layout/release-notes-modal";

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
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("onboarding_completed, full_name")
    .eq("user_id", user.id)
    .single();

  const onboardingCompleted = profile?.onboarding_completed ?? false;
  const userName = profile?.full_name || user.email?.split("@")[0] || "User";

  return (
    <div className="relative min-h-screen bg-background">
      <OnboardingGuard onboardingCompleted={onboardingCompleted} />
      <PastDueChecker />
      <ReleaseNotesModal />
      {/* Sidebar - hidden on mobile */}
      <Sidebar userName={userName} />

      {/* Main content area */}
      <div className="lg:pl-64">
        <TopBar userName={userName} />
        <main className="min-h-[calc(100vh-3.5rem)] p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
