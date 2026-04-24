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
 * How it works:
 *   1. admin.generateLink mints a one-time hashed token and returns an
 *      action_link of the form SUPABASE/auth/v1/verify?token=...&redirect_to=APP/callback.
 *   2. Navigating to the action_link has Supabase verify the token, then
 *      302 to APP/callback?token_hash=...&type=magiclink.
 *   3. The app's /callback route (src/app/(auth)/callback/route.ts) calls
 *      verifyOtp with the token_hash, which sets session cookies on the
 *      APP domain (critical — cookies set on supabase.co don't transfer).
 *   4. /callback redirects to /dashboard with session cookies attached.
 *
 * IMPORTANT: the preview URL (or a wildcard covering it) must be in
 * Supabase's Additional Redirect URLs list, or Supabase rejects the
 * redirectTo and falls back to the Site URL (prod). See README security
 * model section for setup.
 */
export async function signInAsTier(page: Page, tier: Tier): Promise<void> {
  const email = emailFor(tier);
  const client = getAdmin();

  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${APP_BASE_URL}/callback?next=/dashboard`,
    },
  });
  if (error) throw error;

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    throw new Error(`[e2e/session] generateLink returned no action_link for ${email}`);
  }

  // Consume the link. Supabase's verify endpoint will 302 to the app's
  // /callback route, which sets session cookies on the app domain.
  await page.goto(actionLink);
  // Wait until we land on an app route that isn't /callback or /login.
  // (The callback hands off to /dashboard on success, /login on failure.)
  await page.waitForURL(
    (url) =>
      !url.pathname.startsWith("/auth/v1/verify") &&
      !url.pathname.startsWith("/callback"),
    { timeout: 15_000 }
  );
}

/**
 * Convenience — useful for cleanup between tests.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
}
