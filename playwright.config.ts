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

/**
 * Vercel Preview Protection bypass.
 *
 * If the target project has Deployment Protection enabled (SSO wall on
 * preview URLs), unauthenticated requests redirect to vercel.com/login.
 * The fix is Vercel's built-in automation bypass: send the secret as the
 * `x-vercel-protection-bypass` header on every request. We also send
 * `x-vercel-set-bypass-cookie: samesitenone` on the first request so the
 * redirect chain (Supabase verify → app) carries the bypass through.
 *
 * Only added when the env var is set so this remains a no-op for projects
 * without preview protection.
 */
const extraHTTPHeaders: Record<string, string> = {};
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  extraHTTPHeaders["x-vercel-protection-bypass"] =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  extraHTTPHeaders["x-vercel-set-bypass-cookie"] = "samesitenone";
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
    extraHTTPHeaders,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Setup project — signs in each tier test user once and writes
    // session cookies to tests/e2e/.auth/<tier>.json. Runs before any
    // chromium tests (declared as a dependency below). See
    // tests/e2e/global.setup.ts for the full rationale.
    {
      name: "setup",
      testMatch: /global\.setup\.ts$/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  // Intentionally NO `webServer` config — we never start a local server.
  // All tests run against a deployed Vercel URL.
});
