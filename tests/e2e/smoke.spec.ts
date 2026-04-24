/**
 * BP-097 Phase 1: Smoke spec — proves the scaffolding works end-to-end.
 *
 * What it covers:
 *   1. Anonymous load of the landing page (unauthenticated).
 *   2. Signed-in load of the dashboard for each tier, via the magic-link
 *      helper. Asserts we reach an authenticated route without redirecting
 *      back to /login.
 *
 * Run:
 *   E2E_BASE_URL=https://postpilot-v1.vercel.app \
 *   SUPABASE_URL=https://rgzqhyniuzhqfxqrgsdd.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   npm run test:e2e -- smoke
 */
import { expect, test } from "@playwright/test";
import { signInAsTier, type Tier } from "./helpers/session";

test("landing page renders unauthenticated", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/postpilot/i);
});

const TIERS: Tier[] = ["free", "personal", "professional", "team"];

for (const tier of TIERS) {
  test(`magic-link sign-in works for ${tier} tier`, async ({ page }) => {
    await signInAsTier(page, tier);
    // After signInAsTier, we should be on an app route, not /login.
    const url = new URL(page.url());
    expect(url.pathname).not.toMatch(/^\/login/);
    // Dashboard is the default post-login landing.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
}
