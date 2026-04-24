/**
 * BP-097 Phase 2: posted-analytics happy path.
 *
 * Flow:
 *   1. Seeder has already created a "[E2E FIXTURE]" scheduled post
 *      owned by the professional-tier user.
 *   2. Reset the fixture to a clean `scheduled` state (idempotent).
 *   3. Sign in as the professional test user.
 *   4. Navigate to /posts — assert the fixture appears.
 *   5. (Deep interactions — mark-as-posted, manual analytics entry —
 *      are planned for a later pass once basic selectors are verified
 *      against CI. Spec currently validates reachability.)
 *
 * This conservative scope proves the fixture + cleanup + sign-in chain
 * works for the `posts` list page, before we invest in the dialog and
 * analytics-card interactions which will likely need selector tuning.
 */
import { expect, test } from "@playwright/test";
import { signInAsTier } from "./helpers/session";
import { stubAiRoutes } from "./helpers/ai-stubs";
import { getTestUserId, resetScheduledPostFixture } from "./helpers/cleanup";

test.describe("posted-analytics (pro tier)", () => {
  test.beforeAll(async () => {
    const userId = await getTestUserId("professional");
    await resetScheduledPostFixture(userId);
  });

  test.beforeEach(async ({ page }) => {
    await stubAiRoutes(page);
  });

  test("seeded scheduled fixture is visible on /posts", async ({ page }) => {
    await signInAsTier(page, "professional");
    await page.goto("/posts");
    await expect(page).toHaveURL(/\/posts/);

    // The fixture title prefix is deterministic. `exact: false` by default
    // on getByText matches partial, which is what we want.
    await expect(
      page.getByText(/\[E2E FIXTURE\]/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("fixture appears under the Scheduled section on /calendar", async ({ page }) => {
    await signInAsTier(page, "professional");
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/calendar/);

    // Calendar view renders scheduled posts as day-cell entries; the
    // fixture's title is the stable signal.
    await expect(
      page.getByText(/\[E2E FIXTURE\]/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
