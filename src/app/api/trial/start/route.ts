import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TRIAL_DURATION_DAYS, TRIAL_COOLDOWN_DAYS } from "@/lib/constants";
import { logApiError } from "@/lib/api-utils";
import type { CreatorProfile } from "@/types";

const TRIABLE_TIERS = ["creator", "professional"];

export async function POST(request: NextRequest) {
  try {
    const { tier } = await request.json();

    if (!tier || !TRIABLE_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Only Creator and Professional tiers are available for trial." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch current profile
    const { data: profileData, error: profileError } = await supabase
      .from("creator_profiles")
      .select("subscription_tier, account_status, trial_tier, trial_ends_at, last_trial_tiers")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = profileData as Pick<CreatorProfile, "subscription_tier" | "account_status" | "trial_tier" | "trial_ends_at" | "last_trial_tiers">;

    // Already on an active trial
    if (profile.account_status === "trial" && profile.trial_tier) {
      return NextResponse.json(
        { error: "You already have an active trial.", currentTrial: profile.trial_tier },
        { status: 409 }
      );
    }

    // Already on or above the requested tier
    const TIER_RANK: Record<string, number> = { free: 0, creator: 1, professional: 2, team: 3, enterprise: 4 };
    if (TIER_RANK[profile.subscription_tier] >= TIER_RANK[tier]) {
      return NextResponse.json(
        { error: "You are already on this tier or a higher tier." },
        { status: 400 }
      );
    }

    // Check 365-day cooldown
    const lastTrials = (profile.last_trial_tiers ?? {}) as Record<string, string>;
    const lastTrialDate = lastTrials[tier];
    if (lastTrialDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastTrialDate).getTime()) / 86400000);
      if (daysSince < TRIAL_COOLDOWN_DAYS) {
        return NextResponse.json(
          { error: "trial_unavailable" },
          { status: 403 }
        );
      }
    }

    // Start the trial
    const now = new Date();
    const trialEnds = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86400000);

    const { error: updateError } = await supabase
      .from("creator_profiles")
      .update({
        original_tier: profile.subscription_tier,
        trial_tier: tier,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        subscription_tier: tier,
        account_status: "trial",
        managed_ai_access: true,
        managed_ai_expires_at: trialEnds.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      trial_tier: tier,
      trial_ends_at: trialEnds.toISOString(),
      days: TRIAL_DURATION_DAYS,
    });
  } catch (error) {
    logApiError("api/trial/start", error);
    return NextResponse.json({ error: "Failed to start trial" }, { status: 500 });
  }
}
