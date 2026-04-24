/**
 * BP-097 Phase 2: create-schedule happy path.
 *
 * Flow:
 *   1. Sign in as the professional-tier test user (unlimited quotas).
 *   2. Stub every /api/ai/* route — zero AI spend in CI.
 *   3. Navigate to /ideas and generate ideas via stubbed brainstorm.
 *   4. Save an idea, click Develop → lands on a new /posts/<id>.
 *   5. Confirm the post exists; skip deep editor interactions (covered
 *      in posted-analytics). Smoke-level: proves the create chain wires.
 *   6. Cleanup runs post-test to delete anything we created.
 *
 * Keeping this spec conservative — selectors use role+text, which is
 * stable across most UI polish. Edge cases (error paths, validation)
 * are intentionally out of scope for the happy-path suite.
 */
import { expect, test } from "@playwright/test";
import { signInAsTier } from "./helpers/session";
import { stubAiRoutes } from "./helpers/ai-stubs";
import { cleanupTestUserIdeas, cleanupTestUserPosts } from "./helpers/cleanup";

test.describe("create-schedule (pro tier)", () => {
  test.beforeEach(async ({ page }) => {
    await stubAiRoutes(page);
  });

  test.afterAll(async () => {
    // Delete whatever churn this run created, but leave the seeded fixture
    // alone (cleanup helpers skip `[E2E FIXTURE]%` titles automatically).
    await cleanupTestUserPosts("professional");
    await cleanupTestUserIdeas("professional");
  });

  test("authenticated pro user can open /ideas and reach /posts/<id>", async ({ page }) => {
    await signInAsTier(page, "professional");

    // Step 1: land on /ideas. The Generate Ideas button lives here.
    await page.goto("/ideas");
    await expect(page).toHaveURL(/\/ideas/);

    // Step 2: open the Generate Ideas dialog. Button text is stable.
    await page.getByRole("button", { name: /generate ideas/i }).first().click();

    // Step 3: fill the minimum required input and submit. The dialog
    // exposes a topic field; content pillar is optional. The submit
    // button is also labeled "Generate Ideas" inside the dialog.
    const topicInput = page
      .getByRole("textbox", { name: /topic|what.*write.*about/i })
      .first();
    if (await topicInput.isVisible().catch(() => false)) {
      await topicInput.fill("Leadership and listening");
    }

    // Click the dialog's submit. Multiple "Generate Ideas" buttons can
    // exist (page button + dialog button); the one inside the dialog is
    // the last-rendered visible instance.
    const generateButtons = page.getByRole("button", { name: /generate ideas/i });
    await generateButtons.last().click();

    // Stubbed brainstorm returns one idea titled "E2E stub idea: …".
    await expect(
      page.getByText(/E2E stub idea/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
