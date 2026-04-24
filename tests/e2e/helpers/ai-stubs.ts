/**
 * BP-097 Phase 2: Stubs for every /api/ai/* endpoint so E2E specs never
 * hit a real AI provider. Zero AI spend per CI run. Call `stubAiRoutes`
 * at the start of any spec that navigates flows using AI features.
 */
import type { Page } from "@playwright/test";

export async function stubAiRoutes(page: Page): Promise<void> {
  await page.route("**/api/ai/brainstorm", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ideas: [
          {
            title: "E2E stub idea: Listening as a skill",
            description: "A stubbed idea returned for Playwright testing.",
            content_pillars: ["Leadership"],
            tags: ["e2e", "stub"],
          },
        ],
      }),
    });
  });

  await page.route("**/api/ai/draft", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content:
          "This is a stubbed draft returned by Playwright's ai-stubs helper. Real AI is never called in tests.",
        title: "E2E stub draft",
        hashtags: ["#leadership", "#e2etest"],
      }),
    });
  });

  await page.route("**/api/ai/enhance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: "Stubbed enhanced content.",
      }),
    });
  });

  await page.route("**/api/ai/hashtags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        hashtags: ["#leadership", "#e2etest"],
      }),
    });
  });

  await page.route("**/api/ai/analyze-hook", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        strength: "strong",
        score: 82,
        technique: "pattern-interrupt",
        feedback: "Stubbed hook analysis feedback.",
      }),
    });
  });

  await page.route("**/api/ai/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Stubbed chat reply.",
      }),
    });
  });

  await page.route("**/api/ai/generate-image", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        imageUrl: "https://placehold.co/600x400?text=E2E+stub",
      }),
    });
  });

  await page.route("**/api/ai/idea-generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ideas: [] }),
    });
  });
}
