/**
 * BP-097: Delete all E2E test users from prod Supabase.
 *
 * Optional — typically you keep the seeded users around to avoid repeated
 * createUser churn. Use this if you need to rotate fixtures or remove a
 * tier entirely. See seed-test-users.ts for the full security model.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[e2e-teardown] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Fetch every user_profiles row marked as a test user; delete both the
  // profile and the underlying auth.users row.
  const { data: rows, error } = await admin
    .from("user_profiles")
    .select("user_id, full_name")
    .eq("is_test_user", true);

  if (error) throw error;
  if (!rows || rows.length === 0) {
    console.log("[e2e-teardown] No test users to remove.");
    return;
  }

  for (const row of rows) {
    const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(row.user_id);
    if (deleteAuthErr) {
      console.error(`[e2e-teardown] Failed to delete auth user ${row.user_id}:`, deleteAuthErr);
      continue;
    }
    // user_profiles FK ON DELETE CASCADE handles the profile row automatically.
    console.log(`[e2e-teardown] Removed ${row.full_name ?? row.user_id}`);
  }
}

main().catch((err) => {
  console.error("[e2e-teardown] FAILED:", err);
  process.exit(1);
});
