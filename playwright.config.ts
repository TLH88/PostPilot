import { defineConfig, devices } from "@playwright/test";

/**
 * BP-097: Playwright E2E configuration.
 *
 * Targets DEPLOYED URLs only — never localhost. Per the project rule, no
 * dev server is started here. baseURL must come from `E2E_BASE_URL`, which
 * CI populates from the per-PR Vercel preview deployment.
 *
 * Local Playwright runs (optional; Tony never uses them) can set
 * E2E_BASE_URL to a preview or prod URL explicitly.
 */
const baseURL = process.env.E2E_BASE_URL;

if (!baseURL) {
  throw new Error(
    "E2E_BASE_URL is required. In CI, set it to the per-PR Vercel preview URL. Locally, export E2E_BASE_URL=https://postpilot-v1-<branch>.vercel.app."
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 3 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Intentionally NO `webServer` config — we never start a local server.
  // All tests run against a deployed Vercel URL.
});
