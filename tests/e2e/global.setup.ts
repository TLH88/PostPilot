/**
 * BP-097 Phase 2: global setup that signs in each tier test user once,
 * then persists their session cookies to tests/e2e/.auth/<tier>.json.
 *
 * Specs depend on this setup project (via playwright.config.ts
 * `dependencies`), so by the time the `chromium` project runs, the
 * .auth/ files exist and specs load them via `test.use({ storageState })`.
 *
 * Why this matters: previously each spec called signInAsTier at its
 * start. Running two specs for the same user in parallel caused a
 * token race inside Supabase's single-active-magic-link-per-user
 * behavior, intermittently failing sign-in. Signing in ONCE per tier
 * in setup, then reusing the saved session, eliminates the race
 * entirely — and is the canonical Playwright pattern for this
 * problem.
 *
 * Exception: tests/e2e/smoke.spec.ts still calls signInAsTier
 * directly — its whole purpose is to prove the magic-link flow
 * works. It's one test file, and its tests cover four distinct
 * users, so no two concurrent sign-ins target the same user.
 */
import { test as setup } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { signInAsTier, type Tier } from "./helpers/session";

const AUTH_DIR = path.join(__dirname, ".auth");
fs.mkdirSync(AUTH_DIR, { recursive: true });

const TIERS: Tier[] = ["free", "personal", "professional", "team"];

for (const tier of TIERS) {
  setup(`auth: ${tier}`, async ({ page }) => {
    await signInAsTier(page, tier);
    await page.context().storageState({
      path: path.join(AUTH_DIR, `${tier}.json`),
    });
  });
}
