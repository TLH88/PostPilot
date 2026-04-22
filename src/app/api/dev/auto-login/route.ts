// ⚠️  AUTH BYPASS — READ THIS BEFORE TOUCHING
//
// This route exists so automation (Cowork, Playwright, etc.) can sign in
// as a pre-registered test user without going through LinkedIn OAuth. It
// issues a real Supabase session for the target user. Anyone who can
// successfully call this endpoint has full session-level access to that
// user's data.
//
// Three independent gates must ALL pass for the endpoint to do anything:
//
//   1. process.env.VERCEL_ENV must NOT equal "production".
//        Vercel sets VERCEL_ENV automatically: "production" on the
//        production deployment, "preview" on branch deploys, undefined
//        locally. The production deployment ALWAYS short-circuits here
//        and returns 404 — regardless of what other env vars are set.
//
//   2. A shared secret header (X-Dev-Auth-Token) must match the
//        DEV_AUTO_LOGIN_TOKEN env var. If the env var is unset on a
//        given deployment, every request returns 404. No token = no
//        endpoint. This is the secondary gate.
//
//   3. The requested email must be on the DEV_AUTO_LOGIN_ALLOWED_EMAILS
//        allowlist (comma-separated). Requests for emails outside the
//        allowlist are refused. This is the tertiary gate — even with
//        the secret token, an attacker can only impersonate the specific
//        test users you've pre-authorized.
//
// What it does NOT do:
//   - Does not create users on demand. The target must already exist.
//   - Does not send an email. The magic link's properties are returned
//     directly so automation can navigate to the callback URL.
//
// To enable on a Vercel preview deployment, set in Vercel project settings
// for the Preview environment ONLY (never Production):
//   - DEV_AUTO_LOGIN_TOKEN: any random string (~32 chars of your choice)
//   - DEV_AUTO_LOGIN_ALLOWED_EMAILS: comma-separated test emails
//
// To use locally, add both vars to .env.local.
//
// To disable without deploying code, just delete the token env var on the
// deployment — the endpoint instantly returns 404 everywhere.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function fail(status: number, message: string, context?: Record<string, unknown>) {
  // Deliberately identical opaque body for all failure paths so an attacker
  // can't distinguish between "wrong env", "wrong token", and "email not
  // allowed". Real reason goes to the server log for our own diagnostics.
  if (context) {
    // eslint-disable-next-line no-console
    console.warn("[dev/auto-login] refused", { status, message, ...context });
  }
  return NextResponse.json({ error: "Not available" }, { status: 404 });
}

export async function POST(request: Request) {
  // ── Gate 1: Refuse on production, full stop. ─────────────────────────────
  // VERCEL_ENV is set by Vercel automatically and cannot be overridden
  // from the dashboard. This is the strongest possible guarantee that the
  // endpoint is inert on the production deployment.
  if (process.env.VERCEL_ENV === "production") {
    return fail(404, "refused on production VERCEL_ENV");
  }

  // ── Gate 2: Shared secret token. ─────────────────────────────────────────
  const expectedToken = process.env.DEV_AUTO_LOGIN_TOKEN;
  if (!expectedToken) {
    // Endpoint is not configured on this deployment. Stay dark.
    return fail(404, "DEV_AUTO_LOGIN_TOKEN env var is unset");
  }

  const providedToken = request.headers.get("x-dev-auth-token");
  if (!providedToken || providedToken !== expectedToken) {
    return fail(404, "token header missing or mismatch", {
      hadHeader: !!providedToken,
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
  }

  // ── Validate request body. ───────────────────────────────────────────────
  let email: string | undefined;
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
  } catch {
    return fail(400, "invalid JSON body");
  }

  if (!email) {
    return fail(400, "email field missing from body");
  }

  // ── Gate 3: Email allowlist. ─────────────────────────────────────────────
  const allowlistRaw = process.env.DEV_AUTO_LOGIN_ALLOWED_EMAILS ?? "";
  const allowlist = allowlistRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return fail(404, "DEV_AUTO_LOGIN_ALLOWED_EMAILS env var is unset or empty");
  }

  if (!allowlist.includes(email)) {
    return fail(404, "email not on allowlist", {
      attemptedEmail: email,
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    });
  }

  // ── All gates passed. Resolve the magic link. ────────────────────────────
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    // Server misconfiguration — log loudly, respond opaquely.
    // eslint-disable-next-line no-console
    console.error("[dev/auto-login] missing Supabase env vars", {
      hasServiceRoleKey: !!serviceRoleKey,
      hasSupabaseUrl: !!supabaseUrl,
    });
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Look up the user — REQUIRE pre-existing. We do NOT create users here
  // (that was the original risky behavior — arbitrary account creation).
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    // eslint-disable-next-line no-console
    console.error("[dev/auto-login] listUsers failed", { error: listError.message });
    return NextResponse.json({ error: "Auth lookup failed" }, { status: 500 });
  }

  const user = userList.users.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (!user) {
    return fail(404, "allowlisted email not found in Supabase auth", {
      email,
    });
  }

  // Generate a magic link (returns the link properties without sending an email)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: user.email!,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    // eslint-disable-next-line no-console
    console.error("[dev/auto-login] generateLink failed", { error: linkError?.message });
    return NextResponse.json({ error: "Magic link generation failed" }, { status: 500 });
  }

  const { hashed_token } = linkData.properties;
  const callbackUrl = `/callback?token_hash=${hashed_token}&type=magiclink&next=/dashboard`;

  // eslint-disable-next-line no-console
  console.log("[dev/auto-login] issued session", {
    email,
    ip: request.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  });

  return NextResponse.json({ callbackUrl });
}
