/**
 * POST /api/onboarding/complete — finalize onboarding.
 *
 * BP-142: Replaces the wizard's direct upsert + `onboarding_completed=true`
 * write. Server validates the merged profile against the master required-field
 * list before flipping the flag — a Skip-everything path can no longer reach
 * the dashboard with `full_name=null` etc. (UF-007d).
 *
 * If validation fails, the response includes `missing[]` so the client can
 * show "you still need X, Y, Z" inline rather than a generic error.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";
import { validateOnboardingComplete } from "@/lib/onboarding/validate";
import type { ProfileField } from "@/lib/onboarding/required-fields";

const Body = z.object({
  data: z.record(z.string(), z.unknown()),
});

const ALLOWED_FIELDS: ReadonlySet<ProfileField> = new Set<ProfileField>([
  "full_name",
  "headline",
  "linkedin_url",
  "resume_text",
  "linkedin_about",
  "expertise_areas",
  "industries",
  "target_audience",
  "writing_tone",
  "voice_samples",
  "content_pillars",
  "preferred_post_length",
  "use_emojis",
  "use_hashtags",
]);

function pickAllowed(
  data: Record<string, unknown>
): Partial<Record<ProfileField, unknown>> {
  const out: Partial<Record<ProfileField, unknown>> = {};
  for (const [k, v] of Object.entries(data)) {
    if (ALLOWED_FIELDS.has(k as ProfileField)) {
      out[k as ProfileField] = v;
    }
  }
  return out;
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    const json = await request.json();
    body = Body.parse(json);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? "Invalid input")
        : "Invalid JSON";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read the current profile so validation considers existing values, not
    // just the keys this request happens to send. The wizard typically sends
    // every step's data on the final submit, but we don't depend on that.
    const { data: existing } = await supabase
      .from("user_profiles")
      .select(
        "full_name, expertise_areas, industries"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const filteredData = pickAllowed(body.data);
    const merged = { ...(existing ?? {}), ...filteredData };

    const validation = validateOnboardingComplete(merged);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Missing required fields.",
          missing: validation.missing,
        },
        { status: 400 }
      );
    }

    // Bootstrap-and-finalize in a single upsert. If the row didn't exist
    // (rare — /step would normally have created it), upsert covers that case
    // and sets the same defaults the bootstrap path would have.
    const { error: upsertError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          subscription_tier: "free",
          account_status: "active",
          managed_ai_access: true,
          ...filteredData,
          onboarding_completed: true,
          onboarding_current_step: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      logApiError("api/onboarding/complete:upsert", upsertError);
      return NextResponse.json(
        { error: "Failed to complete onboarding." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (err) {
    logApiError("api/onboarding/complete", err);
    return NextResponse.json(
      { error: "Failed to complete onboarding." },
      { status: 500 }
    );
  }
}
