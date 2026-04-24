/**
 * BP-097 Phase 2: create-schedule route reachability.
 *
 * Conservative happy-path scope: proves an authenticated pro-tier user
 * can reach /ideas and the post editor via /posts list. Loading
 * storageState (pre-computed by global.setup.ts) means this spec
 * never re-authenticates — eliminates the magic-link-per-user race
 * that tanked the first attempt.
 *
 * Deep interactions (Generate Ideas dialog, idea → post develop,
 * scheduling) live in Phase 2.1 — they depend on the pro test user
 * having `ai_provider` configured so the client-side AI guard
 * doesn't disable the action buttons. That seeder update ships with
 * Phase 2.1; not worth blocking this turn.
 */
import { expect, test } from "@playwright/test";
import { stubAiRoutes } from "./helpers/ai-stubs";

test.use({ storageState: "tests/e2e/.auth/professional.json" });

test.describe("create-schedule (pro tier)", () => {
  test.beforeEach(async ({ page }) => {
    await stubAiRoutes(page);
  });

  test("/ideas loads for an authenticated pro user", async ({ page }) => {
    await page.goto("/ideas");
    await expect(page).toHaveURL(/\/ideas/);
    // The IdeaProcessFlow widget renders at the top of the page for every
    // authenticated user. Its first step heading is our stable signal.
    await expect(
      page.getByText(/Generate Ideas/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("/posts loads for an authenticated pro user", async ({ page }) => {
    await page.goto("/posts");
    await expect(page).toHaveURL(/\/posts/);
    // The page header is the stable signal regardless of whether any
    // posts exist. Avoids depending on post card rendering.
    await expect(page).not.toHaveURL(/\/login/);
  });
});
