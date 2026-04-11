import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "./sign-out-button";
import { ThemeSetting } from "./theme-setting";
import { AIProviderSettings } from "./ai-provider-settings";
import { LinkedInConnection } from "./linkedin-connection";
import { WorkspaceSettings } from "./workspace-settings";
import { ManagedAIStatus } from "./managed-ai-status";
import type { SubscriptionTier } from "@/lib/constants";
import { hasFeature } from "@/lib/feature-gate";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch AI provider settings + subscription tier
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("ai_provider, ai_model, ai_api_key_encrypted, subscription_tier, force_ai_gateway")
    .eq("user_id", user.id)
    .single();

  const subscriptionTier = (profile?.subscription_tier as SubscriptionTier) ?? "free";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground max-w-[80%]">
          Configure and manage AI Provider information and your LinkedIn connection (enables posting directly and auto-publishing of scheduled posts.).
        </p>
      </div>

      {/* Workspace (Team+ only) */}
      {hasFeature((profile?.subscription_tier as SubscriptionTier) ?? "free", "workspaces") && (
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkspaceSettings />
          </CardContent>
        </Card>
      )}

      {/* Managed AI Access Status */}
      <ManagedAIStatus />

      {/* AI Provider */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Free and Creator accounts are configured to use the PostPilot AI
            Gateway by default. Pro and Enterprise accounts have the option to
            configure and use their own API keys known as BYOK or Bring Your
            Own Key.
          </p>
          <AIProviderSettings
            currentProvider={profile?.ai_provider ?? "anthropic"}
            currentModel={profile?.ai_model ?? null}
            hasExistingKey={!!profile?.ai_api_key_encrypted}
            currentForceGateway={profile?.force_ai_gateway ?? true}
            subscriptionTier={subscriptionTier}
          />
        </CardContent>
      </Card>

      {/* LinkedIn Posting */}
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Posting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect your LinkedIn account to post directly from PostPilot
            and enable auto-publishing of scheduled posts.
          </p>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
            <LinkedInConnection />
          </Suspense>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme for the interface.
          </p>
          <ThemeSetting />
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign out of your PostPilot account.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
