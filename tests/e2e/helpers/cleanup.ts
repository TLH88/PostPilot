/**
 * BP-097 Phase 2: Service-role helpers for cleaning up test-created
 * rows after a spec. The seeder owns long-lived fixtures (user_profiles
 * rows, the scheduled-post fixture); this module owns per-run churn
 * (posts and ideas created DURING a spec).
 *
 * Every helper filters by `is_test_user = true` join on user_profiles
 * OR the seeded test user's auth.users id — so production data is
 * never touched by accident.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return admin;
}

function emailFor(tier: "free" | "personal" | "professional" | "team"): string {
  return `e2e+${tier}@mypostpilot.app`;
}

export async function getTestUserId(
  tier: "free" | "personal" | "professional" | "team"
): Promise<string> {
  const client = getAdmin();
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === emailFor(tier).toLowerCase());
  if (!user) throw new Error(`[e2e/cleanup] Test user ${emailFor(tier)} not found — run seeder first`);
  return user.id;
}

/**
 * Delete all non-fixture posts created by the test user since some cutoff.
 * Leaves `[E2E FIXTURE]%`-titled posts alone (those are seeded, not churn).
 */
export async function cleanupTestUserPosts(
  tier: "free" | "personal" | "professional" | "team",
  opts: { sinceIso?: string } = {}
): Promise<number> {
  const userId = await getTestUserId(tier);
  const client = getAdmin();
  const since = opts.sinceIso ?? new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from("posts")
    .delete()
    .eq("user_id", userId)
    .gte("created_at", since)
    .not("title", "ilike", "[E2E FIXTURE]%")
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function cleanupTestUserIdeas(
  tier: "free" | "personal" | "professional" | "team",
  opts: { sinceIso?: string } = {}
): Promise<number> {
  const userId = await getTestUserId(tier);
  const client = getAdmin();
  const since = opts.sinceIso ?? new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from("ideas")
    .delete()
    .eq("user_id", userId)
    .gte("created_at", since)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Reset the seeded fixture scheduled post back to `scheduled` state, clearing
 * any analytics or posted_at markers so the posted-analytics spec can rerun
 * cleanly. Non-destructive — fixture row is never deleted, only reset.
 */
export async function resetScheduledPostFixture(userId: string): Promise<void> {
  const client = getAdmin();
  const scheduledFor = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client
    .from("posts")
    .update({
      status: "scheduled",
      scheduled_for: scheduledFor,
      scheduled_at: scheduledFor,
      posted_at: null,
      publish_method: null,
      linkedin_post_url: null,
      impressions: null,
      reactions: null,
      comments_count: null,
      reposts: null,
      engagements: null,
    })
    .eq("user_id", userId)
    .ilike("title", "[E2E FIXTURE]%");
  if (error) throw error;
}
