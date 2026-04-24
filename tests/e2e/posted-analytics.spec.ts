/**
 * BP-097 Phase 2: posted-analytics seeded-fixture reachability.
 *
 * Uses storageState from global.setup.ts so we never re-authenticate
 * per test. Also, because storageState loads BEFORE page.goto, the
 * fixture reset (resetScheduledPostFixture) can run in test.beforeAll
 * without racing with the sign-in helper.
 *
 * Scope: verify that the seeded [E2E FIXTURE] scheduled post appears
 * on both /posts and /calendar. Mark-as-posted dialog interaction and
 * manual analytics entry are planned for Phase 2.1 after the initial
 * reachability asserts prove stable in CI.
 */
import { expect, test } from "@playwright/test";
import { stubAiRoutes } from "./helpers/ai-stubs";
import { getTestUserId, resetScheduledPostFixture } from "./helpers/cleanup";

test.use({ storageState: "tests/e2e/.auth/professional.json" });

test.describe("posted-analytics (pro tier)", () => {
  test.beforeAll(async () => {
    const userId = await getTestUserId("professional");
    await resetScheduledPostFixture(userId);
  });

  test.beforeEach(async ({ page }) => {
    await stubAiRoutes(page);
  });

  test("seeded scheduled fixture is visible on /posts", async ({ page }) => {
    await page.goto("/posts");
    await expect(page).toHaveURL(/\/posts/);
    await expect(
      page.getByText(/\[E2E FIXTURE\]/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("fixture appears under the Scheduled section on /calendar", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/calendar/);
    await expect(
      page.getByText(/\[E2E FIXTURE\]/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
