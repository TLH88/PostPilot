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
import { AnnouncementsSetting } from "./announcements-setting";
import { DangerZone } from "./danger-zone";
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

  // Fetch tier + force-gateway preference. Provider/model state is now
  // loaded client-side via /api/providers + /api/settings/provider-keys
  // (BYOK redesign 2026-05-07 — see ai-provider-settings.tsx).
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, force_ai_gateway")
    .eq("user_id", user.id)
    .single();

  const subscriptionTier = (profile?.subscription_tier as SubscriptionTier) ?? "free";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground max-w-[80%]">
          Manage your AI provider settings and connect your LinkedIn account so
          PostPilot can post on your behalf and auto-publish scheduled posts.
        </p>
      </div>

      {/* 1. Announcements */}
      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnnouncementsSetting />
        </CardContent>
      </Card>

      {/* 2. LinkedIn Posting */}
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

      {/* 3. Appearance */}
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

      {/* 4. AI Provider */}
      {/* Managed AI Access Status */}
      <ManagedAIStatus />

      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            PostPilot includes built-in AI for drafting, brainstorming,
            hashtags, and image generation — you don&apos;t need to set anything
            up here to get started. If you&apos;d rather route AI requests
            through your own provider account, bring your own API key and
            you&apos;ll be billed by that provider directly. PostPilot&apos;s
            advanced AI insights (Studio AI critiques, hook analysis, voice
            consistency) work with both built-in AI and your own keys.
          </p>
          <AIProviderSettings
            currentForceGateway={profile?.force_ai_gateway ?? true}
            subscriptionTier={subscriptionTier}
          />
        </CardContent>
      </Card>

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

      {/* 5. Session */}
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

      {/* 6. Danger Zone (BP-131 — account deletion) */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DangerZone />
        </CardContent>
      </Card>
    </div>
  );
}
