/**
 * BP-130: Anonymous waitlist submission for Team + Enterprise tiers.
 *
 * Open POST endpoint — no auth required. Validates email + tier, inserts
 * a tier_waitlist row. Rate-limited per IP and per email (5 submissions
 * per IP per hour, max 3 per email per day) to deter abuse.
 *
 * Reads happen via /api/admin/waitlist (service-role, admin-gated).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  email: z.string().email().max(255),
  tier: z.enum(["team", "enterprise"]),
  message: z.string().max(1000).optional(),
});

const IP_RATE_LIMIT = { count: 5, windowMs: 60 * 60 * 1000 }; // 5 / hour
const EMAIL_RATE_LIMIT = { count: 3, windowMs: 24 * 60 * 60 * 1000 }; // 3 / day

function getClientIp(request: NextRequest): string | null {
  // Vercel sets x-forwarded-for; first entry is the real client.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip") ?? null;
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    const json = await request.json();
    body = Body.parse(json);
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid input" : "Invalid JSON";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  // Rate-limit by IP (best-effort; sufficient for this low-volume use case).
  if (ip) {
    const ipSince = new Date(Date.now() - IP_RATE_LIMIT.windowMs).toISOString();
    const { count: ipCount } = await admin
      .from("tier_waitlist")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", ipSince);
    if ((ipCount ?? 0) >= IP_RATE_LIMIT.count) {
      return NextResponse.json(
        { error: "Too many submissions from this address. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Rate-limit by email.
  const emailSince = new Date(Date.now() - EMAIL_RATE_LIMIT.windowMs).toISOString();
  const { count: emailCount } = await admin
    .from("tier_waitlist")
    .select("*", { count: "exact", head: true })
    .eq("email", body.email.toLowerCase())
    .gte("created_at", emailSince);
  if ((emailCount ?? 0) >= EMAIL_RATE_LIMIT.count) {
    return NextResponse.json(
      { error: "We've already received your interest. We'll be in touch soon." },
      { status: 429 }
    );
  }

  // Capture user_id when submitter happens to be signed in.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // anonymous — fine
  }

  const { error } = await admin.from("tier_waitlist").insert({
    email: body.email.toLowerCase(),
    tier: body.tier,
    message: body.message?.trim() || null,
    user_id: userId,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
