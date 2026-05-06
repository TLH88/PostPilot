/**
 * BP-097 Phase 2: auth-onboarding E2E spec.
 *
 * Proves the deliberately-deferred slice of the Free→Pro happy path:
 *   1. Create a fresh auth user (no user_profiles row) via the Supabase
 *      admin API — i.e. simulate "just signed up".
 *   2. Open an authenticated browser session against the deployed app via
 *      the same magic-link pattern other Phase 2 specs use, but landing
 *      on `/onboarding` rather than `/dashboard`.
 *   3. Walk the 6-step wizard, filling required fields where mandated by
 *      `src/lib/onboarding/required-fields.ts` (BP-142). Free tier skips
 *      the AI Setup step (BP-135), so the visible step order is
 *      [BASIC_INFO, BACKGROUND, EXPERTISE, VOICE_STYLE, CONTENT_TOOLS].
 *   4. Assert per-step that `POST /api/onboarding/step` is the channel
 *      that advances the wizard — and that ZERO direct
 *      `PATCH .../rest/v1/user_profiles` requests fire from the browser.
 *      That negative assertion refutes architectural risk NEW-O4 and is
 *      the load-bearing reason this spec exists.
 *   5. On completion, assert `POST /api/onboarding/complete` returns 200
 *      and the browser lands on the post-onboarding destination
 *      (`/launch-pad` per BP-099) with at least one post-creation entry
 *      point visible.
 *   6. Cleanup: delete the auth user (CASCADE drops user_profiles rows).
 *
 * Why a self-provisioned user rather than the seeded `e2e+free` fixture:
 *   The seeder marks fixtures as `onboarding_completed=true` so other
 *   specs can deep-link straight into the app. Reusing that user would
 *   require either reverting the flag pre-test (race-prone with parallel
 *   workers) or adding a second free fixture (more bookkeeping). One-off
 *   per-spec users are simpler and isolated.
 *
 * QA-DATA-SAFETY: All accounts created here use the
 *   `e2e+onboarding-<random>@mypostpilot.app` namespace. Tony's personal
 *   account is never touched. Cleanup runs in `test.afterAll` even on
 *   failure (Playwright guarantees this). If cleanup fails for any
 *   reason, the teardown script (`npm run test:e2e:teardown`) will
 *   sweep up any orphaned `is_test_user=true` rows on the next run.
 *
 * Known content coupling — DOCUMENTED, not a bug:
 *   The Expertise step exercises suggestion-chip click affordances by
 *   accessible name: `AI/ML`, `Engineering`, `Technology`, `SaaS`. These
 *   strings live in the onboarding wizard's UI under
 *   `src/app/(app)/onboarding/`. If a future content/visual rewrite
 *   (e.g. anything stemming from the preserved BP-144 design references)
 *   renames or replaces those chip labels, the corresponding `getByRole`
 *   selectors in this spec must be updated in lockstep — otherwise the
 *   Expertise step will fail to advance and the spec will fail at the
 *   next required-field gate. Treat this spec as part of any content-
 *   rename PR's blast radius.
 */
import { expect, test, type Page, type Request } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { stubAiRoutes } from "./helpers/ai-stubs";

// ── Env wiring ────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_BASE_URL = process.env.E2E_BASE_URL!;

let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error(
      "[auth-onboarding] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }
  if (!admin) {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return admin;
}

// ── One-off test-user lifecycle ───────────────────────────────────────────

/**
 * Creates a brand-new auth.users row with NO user_profiles row attached.
 * This is the "just signed up, hasn't filled anything yet" state the
 * wizard is designed for. Email follows the `e2e+onboarding-*` namespace
 * mandated by the QA Data Safety hard rule.
 */
async function createFreshTestUser(): Promise<{ id: string; email: string }> {
  const suffix = randomBytes(6).toString("hex");
  const email = `e2e+onboarding-${suffix}@mypostpilot.app`;
  const client = getAdmin();
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true, // bypass verification email
    user_metadata: { e2e_onboarding: true },
  });
  if (error) throw error;
  if (!data.user) {
    throw new Error("[auth-onboarding] createUser returned no user");
  }
  return { id: data.user.id, email };
}

/**
 * Mark the user as a test user so the standard teardown script picks them
 * up if cleanup ever fails. This requires inserting the minimal
 * user_profiles row, which we do AFTER the wizard run when cleanup is
 * about to delete it anyway. We don't insert before the wizard — doing
 * so would defeat the point of testing the bootstrap path in the
 * /api/onboarding/step route (UF-007a).
 */
async function markAsTestUser(userId: string): Promise<void> {
  const client = getAdmin();
  // Best-effort: if the row exists (it will, after the wizard ran), flip
  // is_test_user=true. If it doesn't, ignore — deleteUser will still
  // clean up the auth row.
  await client
    .from("user_profiles")
    .update({ is_test_user: true })
    .eq("user_id", userId);
}

async function deleteTestUser(userId: string): Promise<void> {
  const client = getAdmin();
  // user_profiles has ON DELETE CASCADE on the auth.users FK, so this is
  // sufficient.
  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) {
    // Non-fatal: log loudly so the next teardown sweep cleans it.
    console.error(
      `[auth-onboarding] Failed to delete test user ${userId}:`,
      error
    );
  }
}

/**
 * Open an authenticated session for the given fresh user. Mirrors
 * `signInAsTier` from helpers/session.ts but lands the user on
 * `/onboarding` instead of `/dashboard` — that's where the
 * OnboardingGuard would push them anyway, but going direct removes
 * one navigation hop and makes the network assertions cleaner.
 */
async function signInFreshUser(page: Page, email: string): Promise<void> {
  const client = getAdmin();
  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;
  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error(
      `[auth-onboarding] generateLink returned no hashed_token for ${email}`
    );
  }

  const callbackUrl = new URL("/callback", APP_BASE_URL);
  callbackUrl.searchParams.set("token_hash", hashedToken);
  callbackUrl.searchParams.set("type", "magiclink");
  callbackUrl.searchParams.set("next", "/onboarding");
  await page.goto(callbackUrl.toString());

  // Settle once we're off /callback. Success goes to /onboarding.
  // OnboardingGuard would also bounce /dashboard → /onboarding for a
  // user with onboarding_completed=false, so either path is acceptable
  // here — we'll explicitly navigate to /onboarding next.
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/callback"),
    { timeout: 15_000 }
  );
}

// ── Network monitor ───────────────────────────────────────────────────────

interface RequestLog {
  stepPosts: Array<{ url: string; method: string }>;
  completePosts: Array<{ url: string; method: string }>;
  directProfilePatches: Array<{ url: string; method: string }>;
}

/**
 * Attach a request listener that records the three things this spec
 * cares about:
 *   - POST /api/onboarding/step (expected on every step transition)
 *   - POST /api/onboarding/complete (expected once at the end)
 *   - PATCH/PUT/POST/DELETE to /rest/v1/user_profiles (must be ZERO)
 *
 * The third bucket is the load-bearing assertion — it proves the wizard
 * is server-authoritative (BP-142) rather than mutating user_profiles
 * directly from the client (the pre-BP-142 anti-pattern that NEW-O4
 * warned about).
 */
function attachNetworkMonitor(page: Page): RequestLog {
  const log: RequestLog = {
    stepPosts: [],
    completePosts: [],
    directProfilePatches: [],
  };

  page.on("request", (req: Request) => {
    const url = req.url();
    const method = req.method();
    if (
      method === "POST" &&
      /\/api\/onboarding\/step(?:\?|$)/.test(url)
    ) {
      log.stepPosts.push({ url, method });
    }
    if (
      method === "POST" &&
      /\/api\/onboarding\/complete(?:\?|$)/.test(url)
    ) {
      log.completePosts.push({ url, method });
    }
    // Catch any direct mutation against the user_profiles REST endpoint.
    // PostgREST mutates via PATCH (update), POST (insert / upsert), or
    // DELETE. We flag all three so a regression is impossible to miss.
    if (
      ["PATCH", "POST", "DELETE", "PUT"].includes(method) &&
      /\/rest\/v1\/user_profiles(?:\?|$)/.test(url)
    ) {
      log.directProfilePatches.push({ url, method });
    }
  });

  return log;
}

// ── Spec ──────────────────────────────────────────────────────────────────

test.describe("auth-onboarding (free tier, fresh user)", () => {
  // Self-provisioned per spec run — never reuse the seeder fixture.
  let userId: string;
  let userEmail: string;

  test.beforeAll(async () => {
    const fresh = await createFreshTestUser();
    userId = fresh.id;
    userEmail = fresh.email;
  });

  test.afterAll(async () => {
    if (userId) {
      // Mark the row (if any) so a future teardown sweep would catch it
      // if delete fails for any reason. Best-effort; ignore errors.
      await markAsTestUser(userId).catch(() => {});
      await deleteTestUser(userId);
    }
  });

  test("walks the 6-step wizard via /api/onboarding/* with no direct REST writes", async ({
    page,
  }) => {
    // 70s for a 5-visible-step walkthrough is plenty; the global default
    // is 60s but the request-monitor + admin auth round-trips eat a few
    // seconds before any UI work begins.
    test.setTimeout(70_000);

    await stubAiRoutes(page);
    const requestLog = attachNetworkMonitor(page);

    await signInFreshUser(page, userEmail);
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/onboarding(?:\?|$|\/)/);
    // The wizard heading is the same across every step.
    await expect(
      page.getByRole("heading", { name: /Welcome to PostPilot/i })
    ).toBeVisible({ timeout: 15_000 });

    // ── Step 0: Basic Info ────────────────────────────────────────────
    // full_name is REQUIRED. Headline + LinkedIn URL are nice-to-haves.
    // Step titles render in <CardTitle> (a styled div with
    // data-slot="card-title" — no heading role), so match by text rather
    // than role. The page-level <h1>"Welcome to PostPilot"</h1> above
    // still uses getByRole("heading").
    await expect(
      page.getByText(/Let.+s get to know you!/i)
    ).toBeVisible();
    await page.getByLabel("Full Name").fill("E2E Onboarding User");
    await page.getByLabel("Professional Headline").fill("Test Headline");
    await page
      .getByLabel("LinkedIn Profile URL")
      .fill("https://linkedin.com/in/e2e-onboarding-user");

    const step0Before = requestLog.stepPosts.length;
    const step0Response = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/onboarding/step") &&
        resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Next/i }).click();
    const step0Resp = await step0Response;
    expect(step0Resp.status()).toBe(200);
    const step0Body = (await step0Resp.json()) as {
      ok: true;
      currentStep: number;
      nextStep: number | null;
      tier?: string | null;
    };
    expect(step0Body.ok).toBe(true);
    // Free tier should skip step 4 (AI Setup), so after step 0 the next
    // visible step is 1 (Background).
    expect(step0Body.nextStep).toBe(1);
    expect(requestLog.stepPosts.length).toBe(step0Before + 1);

    // ── Step 1: Background ────────────────────────────────────────────
    // No required fields. We fill resume_text anyway — verifies that
    // optional-field writes also flow through /api/onboarding/step.
    await expect(
      page.getByText(/Share your professional journey/i)
    ).toBeVisible();
    await page
      .getByLabel("Paste Resume Text")
      .fill(
        "Senior Engineer with 10+ years of experience building developer tools. Led teams at TestCo and Acme."
      );
    await page
      .getByLabel("LinkedIn About Section")
      .fill("Builder. Mentor. Coffee enthusiast.");

    const step1Before = requestLog.stepPosts.length;
    const step1Response = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/onboarding/step") &&
        resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Next/i }).click();
    const step1Resp = await step1Response;
    expect(step1Resp.status()).toBe(200);
    const step1Body = (await step1Resp.json()) as {
      ok: true;
      nextStep: number | null;
    };
    expect(step1Body.nextStep).toBe(2);
    expect(requestLog.stepPosts.length).toBe(step1Before + 1);

    // ── Step 2: Expertise ─────────────────────────────────────────────
    // expertise_areas + industries are REQUIRED. We click two
    // suggestion chips (one of each) plus add a target audience.
    await expect(
      page.getByText(/Define your expertise and audience/i)
    ).toBeVisible();
    // Suggestion chips render as <button> with the label text.
    await page.getByRole("button", { name: "AI/ML", exact: true }).click();
    await page.getByRole("button", { name: "Engineering", exact: true }).click();
    await page.getByRole("button", { name: "Technology", exact: true }).click();
    await page.getByRole("button", { name: "SaaS", exact: true }).click();
    await page
      .getByLabel("Target Audience")
      .fill("Mid-level engineering managers at fast-growing SaaS startups.");

    const step2Before = requestLog.stepPosts.length;
    const step2Response = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/onboarding/step") &&
        resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Next/i }).click();
    const step2Resp = await step2Response;
    expect(step2Resp.status()).toBe(200);
    const step2Body = (await step2Resp.json()) as {
      ok: true;
      nextStep: number | null;
      visibleSteps?: number[];
    };
    expect(step2Body.nextStep).toBe(3);
    // While we're here, sanity-check the tier-aware visible-step list.
    // Free tier should NOT include step 4 (AI Setup).
    if (step2Body.visibleSteps) {
      expect(step2Body.visibleSteps).not.toContain(4);
      expect(step2Body.visibleSteps).toContain(0);
      expect(step2Body.visibleSteps).toContain(5);
    }
    expect(requestLog.stepPosts.length).toBe(step2Before + 1);

    // ── Step 3: Voice & Style ─────────────────────────────────────────
    // No required fields. Set tone to default + tweak a toggle so we
    // know the form serialized something.
    await expect(
      page.getByText(/Craft your unique voice/i)
    ).toBeVisible();
    // Toggle "Use Hashtags" off via its label association — Switch
    // components are <button role="switch"> in shadcn/Base UI; we click
    // the label text to flip it. (Default value is true; flipping makes
    // the field provably present in the request body.)
    // NB: clicking the label flips the underlying switch.
    await page
      .locator('label[for="useHashtags"]')
      .click({ force: true })
      .catch(() => {
        /* If the label isn't directly clickable, the default value
           still flows through; not load-bearing. */
      });

    const step3Before = requestLog.stepPosts.length;
    const step3Response = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/onboarding/step") &&
        resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^Next/i }).click();
    const step3Resp = await step3Response;
    expect(step3Resp.status()).toBe(200);
    const step3Body = (await step3Resp.json()) as {
      ok: true;
      nextStep: number | null;
    };
    // Free tier skips step 4, so after step 3 the next is step 5
    // (Content Tools).
    expect(step3Body.nextStep).toBe(5);
    expect(requestLog.stepPosts.length).toBe(step3Before + 1);

    // ── Step 5: Content Tools (last visible step for free tier) ───────
    // No required fields and no inputs — just a "Complete Setup" button
    // that fires both /step (final step record) and /complete.
    // Scope to the card title since "Content Tools" also appears in the
    // step indicator (Playwright strict mode would otherwise reject the
    // ambiguous match).
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /^Content Tools$/i })
    ).toBeVisible();

    const stepCountBeforeComplete = requestLog.stepPosts.length;
    const completeResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/onboarding/complete") &&
        resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Complete Setup/i }).click();
    const completeResp = await completeResponse;
    expect(completeResp.status()).toBe(200);
    const completeBody = (await completeResp.json()) as {
      ok: true;
      redirectTo?: string;
    };
    expect(completeBody.ok).toBe(true);

    // The wizard fires /step for the final step BEFORE /complete (see
    // handleSubmit in onboarding/page.tsx). Confirm we logged at least
    // one more step POST.
    expect(requestLog.stepPosts.length).toBeGreaterThan(
      stepCountBeforeComplete
    );
    expect(requestLog.completePosts.length).toBeGreaterThanOrEqual(1);

    // Wizard redirects via window.location.href to /launch-pad.
    await page.waitForURL(/\/launch-pad(?:\?|$|\/)/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/launch-pad/);

    // Post-onboarding entry-point sanity check. Launch Pad surfaces at
    // least one of: "Generate New Ideas" (Brainstorm card) or
    // "Create a Post". Either passing satisfies the spec.
    const launchPadEntryPoint = page
      .getByText(/Generate New Ideas|Create a Post|Brainstorm/i)
      .first();
    await expect(launchPadEntryPoint).toBeVisible({ timeout: 15_000 });

    // ── Critical negative assertion (refutes NEW-O4) ──────────────────
    // No direct user_profiles REST mutation should have happened from
    // the browser at any point. If this fails, the wizard regressed to
    // the pre-BP-142 client-side write pattern.
    expect(
      requestLog.directProfilePatches,
      `Direct user_profiles REST mutations were detected: ${JSON.stringify(
        requestLog.directProfilePatches
      )}. The wizard must route all writes through /api/onboarding/*.`
    ).toEqual([]);

    // We expect at least one /step POST per visible step (5 total) plus
    // the final /step+/complete pair fired by Complete Setup. Lower
    // bound is the safer assertion since the wizard may emit extra
    // /step calls in response to retries or auto-saves added later.
    expect(requestLog.stepPosts.length).toBeGreaterThanOrEqual(5);
    expect(requestLog.completePosts.length).toBeGreaterThanOrEqual(1);
  });
});
