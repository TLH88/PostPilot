/**
 * BP-097 Phase 1: Idempotent Playwright E2E test-user seeder.
 *
 * Creates/updates one test user per subscription tier in the prod Supabase
 * project (owner decision 2026-04-24 — reuse prod). Each user is marked
 * `is_test_user = true` so future admin queries can filter them out.
 *
 * WHAT GETS SEEDED per tier (free / personal / professional / team):
 *   - auth.users row (via admin.createUser; email_confirm=true so no verification)
 *   - public.user_profiles row with:
 *       * subscription_tier set to the target tier
 *       * is_test_user = true
 *       * full_name = "E2E <Tier>"
 *       * onboarded_at stamped so tests can opt-in or opt-out
 *       * linkedin_* columns set to dummy values so the app shows "connected"
 *         UI state. The tokens are intentionally NOT decryptable — if a test
 *         ever accidentally hits the LinkedIn publish/validate path, the AES-GCM
 *         decryption fails loudly rather than reaching real LinkedIn. Fail-safe.
 *
 * SECURITY MODEL:
 *   - Requires SUPABASE_SERVICE_ROLE_KEY. Loaded from env only — never commit.
 *   - Service role bypasses RLS by design; that is exactly what a seeder needs.
 *   - Magic-link sessions (via Playwright helper) are single-use and short-lived;
 *     never logged.
 *   - is_test_user has no privilege implications — see
 *     supabase/migrations/20260425_add_is_test_user.sql.
 *   - Fake encrypted tokens mean publish/validate CANNOT succeed against real
 *     LinkedIn. A test that tries to publish will fail with a decrypt error,
 *     which is the intended guardrail.
 *
 * USAGE:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run test:e2e:seed
 *
 * Idempotent: safe to re-run. Never deletes users; use teardown-test-users.ts
 * for cleanup.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

type Tier = "free" | "personal" | "professional" | "team";

const TIERS: Tier[] = ["free", "personal", "professional", "team"];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "[e2e-seed] Missing env. Require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function emailFor(tier: Tier): string {
  return `e2e+${tier}@mypostpilot.app`;
}

/**
 * Random base64 blob for the three LinkedIn token columns. Not real ciphertext
 * — that's intentional. See SECURITY MODEL in the file header.
 */
function fakeEncryptedBlob(): string {
  return randomBytes(32).toString("base64");
}

async function findUserByEmail(email: string) {
  // Paginates auth.users; the prod project has low user count, one page covers it.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertTestUser(tier: Tier): Promise<{ id: string; email: string }> {
  const email = emailFor(tier);

  let user = await findUserByEmail(email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true, // bypass the verification email
      user_metadata: { e2e_tier: tier },
    });
    if (error) throw error;
    if (!data.user) throw new Error(`[e2e-seed] createUser returned no user for ${email}`);
    user = data.user;
    console.log(`[e2e-seed] Created auth user for ${email} (${user.id})`);
  } else {
    console.log(`[e2e-seed] Reusing auth user for ${email} (${user.id})`);
  }

  // Upsert user_profiles row.
  const now = new Date().toISOString();
  const profilePayload = {
    user_id: user.id,
    subscription_tier: tier,
    is_test_user: true,
    full_name: `E2E ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
    headline: `Playwright test user — ${tier} tier`,
    // Real schema: onboarding_completed (bool) + onboarding_current_step (smallint).
    // Mark tests as fully onboarded so specs can skip the intro flow.
    onboarding_completed: true,
    onboarding_current_step: 99,
    // Mark LinkedIn as connected with fake-but-structurally-valid values.
    // Any real LinkedIn API call will fail at decrypt, which is the guardrail.
    linkedin_connected_at: now,
    linkedin_member_id: `e2e-fake-member-${tier}`,
    linkedin_access_token_encrypted: fakeEncryptedBlob(),
    linkedin_access_token_iv: randomBytes(12).toString("base64"),
    linkedin_access_token_auth_tag: randomBytes(16).toString("base64"),
    linkedin_token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    linkedin_token_validated_at: now,
    linkedin_scopes: ["openid", "profile", "w_member_social", "email"],
    updated_at: now,
  };

  const { error: upsertErr } = await admin
    .from("user_profiles")
    .upsert(profilePayload, { onConflict: "user_id" });

  if (upsertErr) throw upsertErr;

  console.log(`[e2e-seed] Upserted ${tier} profile for ${email}`);
  return { id: user.id, email };
}

async function main() {
  console.log("[e2e-seed] Seeding E2E test users in project", SUPABASE_URL);
  const results = [];
  for (const tier of TIERS) {
    results.push(await upsertTestUser(tier));
  }

  console.log("\n[e2e-seed] Done. Seeded users:");
  for (const r of results) console.log(`  ${r.email}  ->  ${r.id}`);
  console.log(
    "\n[e2e-seed] Next step: Playwright specs use tests/e2e/helpers/session.ts to open an authenticated session against the deployed app without a real LinkedIn OAuth round-trip."
  );
}

main().catch((err) => {
  console.error("[e2e-seed] FAILED:", err);
  process.exit(1);
});
