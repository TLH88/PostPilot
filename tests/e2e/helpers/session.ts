/**
 * BP-097: Playwright session helper — opens an authenticated session against
 * the deployed app WITHOUT going through LinkedIn OAuth.
 *
 * Uses `supabase.auth.admin.generateLink({ type: "magiclink" })` server-side
 * to mint a one-time `hashed_token`, then drives the browser through
 * `/auth/v1/verify?token=...&type=magiclink` → cookie-setting redirect.
 *
 * Why this pattern:
 *   - OIDC / LinkedIn is the only interactive auth method in PostPilot.
 *     Real OAuth in CI is flaky + risks account flagging.
 *   - Magic-link tokens are single-use, short-lived (1 hour default), and
 *     never hit anyone's inbox here because we read them directly from the
 *     admin API response.
 *   - Service-role access is isolated to the Node-side of Playwright (this
 *     file runs in the test runner, never in the browser).
 *
 * SECURITY NOTES:
 *   - `SUPABASE_SERVICE_ROLE_KEY` is loaded from env. Never log it. Never
 *     put it into browser context, `page.evaluate`, or test fixtures that
 *     might be saved to traces.
 *   - The generated magic-link `action_link` is also secret until consumed.
 *     We navigate to it and discard it within the same Playwright step.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

export type Tier = "free" | "personal" | "professional" | "team";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_BASE_URL = process.env.E2E_BASE_URL!;

let admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error(
      "[e2e/session] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for session-helper to run."
    );
  }
  if (!admin) {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return admin;
}

function emailFor(tier: Tier): string {
  return `e2e+${tier}@mypostpilot.app`;
}

/**
 * Sign in as the seeded test user for the given tier. After this call, the
 * browser holds a valid Supabase session cookie and any navigation hits
 * authenticated routes normally.
 *
 * Prereq: scripts/e2e/seed-test-users.ts has been run at least once against
 * the same project.
 *
 * How it works (SSR-friendly PKCE pattern):
 *   1. admin.generateLink returns { hashed_token, email_otp, action_link }.
 *      We use `hashed_token` directly; `action_link` is the email-click
 *      variant that verifies on supabase.co and sets cookies there — no
 *      good for a different origin.
 *   2. Navigate directly to APP/callback?token_hash=<hashed>&type=magiclink.
 *   3. The app's /callback route (src/app/(auth)/callback/route.ts) calls
 *      verifyOtp({ token_hash, type }), which validates the token and sets
 *      session cookies on the APP domain (the one we're testing against).
 *   4. /callback redirects to /dashboard with cookies attached.
 *
 * No Supabase redirect-URL list entry is required with this flow — we
 * never call the verify endpoint's redirect_to. (The entries are still
 * useful for other flows and are documented in README.)
 */
export async function signInAsTier(page: Page, tier: Tier): Promise<void> {
  const email = emailFor(tier);
  const client = getAdmin();

  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;

  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error(
      `[e2e/session] generateLink returned no hashed_token for ${email}`
    );
  }

  // Bypass supabase.co/auth/v1/verify entirely. Hit the app's /callback
  // directly so verifyOtp runs on the app's server and cookies land on
  // the preview domain.
  const callbackUrl = new URL("/callback", APP_BASE_URL);
  callbackUrl.searchParams.set("token_hash", hashedToken);
  callbackUrl.searchParams.set("type", "magiclink");
  callbackUrl.searchParams.set("next", "/dashboard");

  await page.goto(callbackUrl.toString());

  // Wait to settle on a post-callback route. Success hops to /dashboard;
  // any verifyOtp failure bounces to /login (which is informative — we
  // want the test to fail loudly rather than silently proceeding).
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/callback"),
    { timeout: 15_000 }
  );
}

/**
 * Convenience — useful for cleanup between tests.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
}
