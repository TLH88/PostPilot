/**
 * BP-085 Phase 3 — Cron entry point: evaluate budgets, fire alerts,
 * auto-pause non-Team users over their monthly USD limit.
 *
 * Auth: pg_cron-compatible JWT signature verification with PG_CRON_JWT_SECRET,
 * matching the pattern used by the `process-account-deletions` and
 * `publish-scheduled-posts` Supabase Edge Functions. Owner authorized this
 * pattern over the Vercel-Cron Bearer-CRON_SECRET convention on 2026-05-04
 * so a single JWT secret can drive both Edge Functions and this in-app
 * route from the same pg_cron schedule.
 *
 * The signature-verification helper is a port of the Deno implementation in
 * `supabase/functions/process-account-deletions/index.ts:37-54` to the
 * Node-runtime Web Crypto API exposed in Next.js API routes. Functionally
 * identical: HMAC-SHA256 over `${header}.${payload}` compared against the
 * base64url-decoded signature segment.
 *
 * Owner schedules manually (pg_cron + pg_net.http_post) after review — this
 * route does not self-schedule.
 *
 * Isolation: this is a brand-new endpoint. No existing callers; no other
 * routes use PG_CRON_JWT_SECRET in the in-app codebase (only Edge Functions),
 * and CRON_SECRET continues to drive `/api/cron/cleanup-images` unchanged.
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/api-utils";
import { evaluateAllManagedUsers } from "@/lib/ai/budget-evaluator";

async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = Uint8Array.from(
    atob(signature.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
  return crypto.subtle.verify("HMAC", key, sigBytes, data);
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.PG_CRON_JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const valid = await verifyJwtSignature(token, secret);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await evaluateAllManagedUsers();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    logApiError("api/cron/evaluate-budgets", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
