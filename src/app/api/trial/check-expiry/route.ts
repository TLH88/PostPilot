import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";
import type { CreatorProfile } from "@/types";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profileData } = await supabase
      .from("creator_profiles")
      .select("account_status, subscription_tier, original_tier, trial_tier, trial_started_at, trial_ends_at, last_trial_tiers")
      .eq("user_id", user.id)
      .single();

    if (!profileData) {
      return NextResponse.json({ expired: false });
    }

    const profile = profileData as Pick<CreatorProfile, "account_status" | "subscription_tier" | "original_tier" | "trial_tier" | "trial_started_at" | "trial_ends_at" | "last_trial_tiers">;

    // Not on a trial — nothing to check
    if (profile.account_status !== "trial" || !profile.trial_ends_at) {
      return NextResponse.json({ expired: false, account_status: profile.account_status });
    }

    // Trial still active
    if (new Date(profile.trial_ends_at) > new Date()) {
      const daysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000);
      return NextResponse.json({
        expired: false,
        account_status: "trial",
        trial_tier: profile.trial_tier,
        days_left: daysLeft,
      });
    }

    // Trial has expired — revert
    const lastTrials = { ...(profile.last_trial_tiers ?? {}) } as Record<string, string>;
    if (profile.trial_tier && profile.trial_started_at) {
      lastTrials[profile.trial_tier] = profile.trial_started_at;
    }

    const revertTier = profile.original_tier ?? "free";

    const { error: updateError } = await supabase
      .from("creator_profiles")
      .update({
        subscription_tier: revertTier,
        account_status: "active",
        original_tier: null,
        trial_tier: null,
        trial_started_at: null,
        trial_ends_at: null,
        last_trial_tiers: lastTrials,
        managed_ai_access: false,
        managed_ai_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      expired: true,
      reverted_to: revertTier,
      expired_trial: profile.trial_tier,
    });
  } catch (error) {
    logApiError("api/trial/check-expiry", error);
    return NextResponse.json({ error: "Failed to check trial" }, { status: 500 });
  }
}
