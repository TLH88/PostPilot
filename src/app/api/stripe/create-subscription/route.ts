/**
 * BP-015 / BP-130: Server-side guard for subscription creation.
 *
 * Real Stripe integration is deferred to BP-015 (currently blocked on
 * owner-side business formation). This endpoint exists today for one
 * reason: to be the authoritative server-side block on Team and
 * Enterprise tier signups while those tiers are deferred (BP-130).
 *
 * Even with the UI showing "Coming Soon" CTAs, a determined caller
 * could theoretically POST a subscription request directly. This
 * route makes that impossible regardless of the UI surface.
 *
 * BP-015 will replace this implementation with the real
 * Subscriptions.create + payment_intent client-secret flow once
 * Stripe is provisioned.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  tier: z.string(),
  billing: z.enum(["monthly", "yearly"]).optional(),
});

const COMING_SOON_TIERS = new Set(["team", "enterprise"]);

export async function POST(request: NextRequest) {
  // Auth check first — even before BP-015 lands, no anonymous subscriptions.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // BP-130: explicit reject for tiers that aren't yet GA. UI shows
  // "Coming Soon" + waitlist CTA; this is the matching server gate so
  // the UI alone isn't the only line of defense.
  if (COMING_SOON_TIERS.has(body.tier)) {
    return NextResponse.json(
      {
        error:
          "This plan is not yet available. Please join the waitlist at /pricing and we'll reach out as soon as it launches.",
      },
      { status: 403 }
    );
  }

  // BP-015: real Stripe integration not yet implemented (blocked on
  // owner-side business formation). Return 501 so callers can clearly
  // distinguish "not allowed" (403) from "not built yet" (501).
  return NextResponse.json(
    {
      error:
        "Subscription billing is not yet available. We're finalizing payment processing — check back soon.",
    },
    { status: 501 }
  );
}
