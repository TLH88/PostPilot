import { createClient } from "@/lib/supabase/server";
import {
  SUBSCRIPTION_TIERS,
  QUOTA_COLUMN_MAP,
  type SubscriptionTier,
  type QuotaType,
} from "@/lib/constants";

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  tier: SubscriptionTier;
}

export interface QuotaStatus {
  tier: SubscriptionTier;
  periodStart: string;
  posts: { used: number; limit: number };
  brainstorms: { used: number; limit: number };
  chat_messages: { used: number; limit: number };
  scheduled_posts: { used: number; limit: number };
  image_generations: { used: number; limit: number };
}

/**
 * Get the user's subscription tier from creator_profiles.
 */
export async function getUserTier(
  userId: string
): Promise<SubscriptionTier> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_profiles")
    .select("subscription_tier")
    .eq("user_id", userId)
    .single();

  return (data?.subscription_tier as SubscriptionTier) ?? "free";
}

/**
 * Get the first day of the current month as a date string (YYYY-MM-DD).
 */
function getCurrentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Get or create the quota row for the current billing period.
 * If no row exists for this month, one is created with zeroed counts.
 */
export async function getOrCreateQuota(userId: string) {
  const supabase = await createClient();
  const periodStart = getCurrentPeriodStart();

  // Try to fetch existing row
  const { data: existing } = await supabase
    .from("usage_quotas")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .single();

  if (existing) return existing;

  // Create new row for this month
  const { data: created, error } = await supabase
    .from("usage_quotas")
    .insert({
      user_id: userId,
      period_start: periodStart,
    })
    .select()
    .single();

  if (error) {
    // Race condition: another request created it — retry fetch
    const { data: retried } = await supabase
      .from("usage_quotas")
      .select("*")
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .single();

    if (retried) return retried;
    throw new Error("Failed to create quota record");
  }

  return created;
}

/**
 * Check if a user has remaining quota for a given action type.
 */
export async function checkQuota(
  userId: string,
  type: QuotaType
): Promise<QuotaCheckResult> {
  const tier = await getUserTier(userId);
  const limits = SUBSCRIPTION_TIERS[tier].limits;
  const limit = limits[type];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, used: 0, limit: -1, tier };
  }

  const quota = await getOrCreateQuota(userId);
  const column = QUOTA_COLUMN_MAP[type];
  const used = (quota as Record<string, number>)[column] ?? 0;

  return {
    allowed: used < limit,
    used,
    limit,
    tier,
  };
}

/**
 * Increment a quota counter after a successful action.
 */
export async function incrementQuota(
  userId: string,
  type: QuotaType
): Promise<void> {
  const supabase = await createClient();
  const quota = await getOrCreateQuota(userId);
  const column = QUOTA_COLUMN_MAP[type];
  const currentValue = (quota as Record<string, number>)[column] ?? 0;

  await supabase
    .from("usage_quotas")
    .update({
      [column]: currentValue + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quota.id);
}

/**
 * Get full quota status for the authenticated user (used by /api/quota).
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const tier = await getUserTier(userId);
  const limits = SUBSCRIPTION_TIERS[tier].limits;
  const quota = await getOrCreateQuota(userId);

  return {
    tier,
    periodStart: quota.period_start,
    posts: { used: quota.posts_created, limit: limits.posts },
    brainstorms: { used: quota.brainstorms_used, limit: limits.brainstorms },
    chat_messages: {
      used: quota.chat_messages_used,
      limit: limits.chat_messages,
    },
    scheduled_posts: {
      used: quota.scheduled_posts,
      limit: limits.scheduled_posts,
    },
    image_generations: {
      used: quota.image_generations_used ?? 0,
      limit: limits.image_generations,
    },
  };
}
