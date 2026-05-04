/**
 * POST /api/onboarding/step — server-authoritative wizard step transition.
 *
 * BP-142: Replaces direct `supabase.from("user_profiles").update()` calls
 * from the wizard. Owns three things the client cannot reliably enforce:
 *
 *   1. **Bootstrap.** If the user has no `user_profiles` row, create one with
 *      tier-aware defaults (subscription_tier='free', managed_ai_access=true,
 *      onboarding_completed=false). Closes UF-007a — without this, every
 *      brand-new free user saw the BYOK step contrary to BP-135.
 *   2. **Server-clamped step number.** Forward-jumps past the user's true
 *      progress are rejected. Closes UF-007e — fake checkmarks via ?step=N.
 *   3. **Per-step required-field validation.** Required fields must be
 *      present in the request before the step is recorded. Closes UF-007d —
 *      Skip-everything completion path.
 *
 * The client mirror of (3) is a UX nicety; this route is the ground truth.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";
import {
  REQUIRED_FIELDS_PER_STEP,
  TOTAL_STEPS,
  isFieldComplete,
  visibleStepsForTier,
  type ProfileField,
} from "@/lib/onboarding/required-fields";

/**
 * The wizard sends `step` (current index it just finished filling) plus a
 * `data` bag of fields it wrote on that step. Server validates, persists,
 * and tells the client the canonical next step.
 *
 * `data` is a permissive record — the wizard sends only the keys it touched.
 * Each key is validated by being on the `ProfileField` whitelist below.
 */
const Body = z.object({
  step: z.number().int().min(0).max(TOTAL_STEPS - 1),
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

/**
 * Filter incoming data to whitelisted fields only. Anything else is dropped
 * so the client cannot push arbitrary columns (e.g. subscription_tier,
 * managed_ai_access, encrypted token columns) via this route.
 */
function pickAllowed(
  data: Record<string, unknown>
): Record<ProfileField, unknown> {
  const out: Partial<Record<ProfileField, unknown>> = {};
  for (const [k, v] of Object.entries(data)) {
    if (ALLOWED_FIELDS.has(k as ProfileField)) {
      out[k as ProfileField] = v;
    }
  }
  return out as Record<ProfileField, unknown>;
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

    // ── Bootstrap (UF-007a) ────────────────────────────────────────────────
    // Read the row; if it doesn't exist, insert defaults and re-read. We do
    // this rather than upsert-with-defaults because we need the tier value
    // to validate `body.step` against `visibleStepsForTier(...)`.
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("subscription_tier, onboarding_current_step, onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    let tier: string | null =
      (existing as { subscription_tier?: string | null } | null)
        ?.subscription_tier ?? null;
    let serverCurrentStep: number = Math.max(
      0,
      (existing as { onboarding_current_step?: number | null } | null)
        ?.onboarding_current_step ?? 0
    );

    if (!existing) {
      const { error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: user.id,
          subscription_tier: "free",
          account_status: "active",
          onboarding_completed: false,
          onboarding_current_step: 0,
          // Per BP-151 + memory note `feedback_ai_access_default.md`: free
          // users get system AI access by default.
          managed_ai_access: true,
        });
      if (insertError) {
        logApiError("api/onboarding/step:bootstrap", insertError);
        return NextResponse.json(
          { error: "Failed to initialize profile." },
          { status: 500 }
        );
      }
      tier = "free";
      serverCurrentStep = 0;
    }

    const visibleSteps = visibleStepsForTier(tier);

    // ── Step validation (UF-007e) ──────────────────────────────────────────
    // The user must be writing for a step that's visible to their tier AND
    // not jumping forward past their server-known position by more than one.
    if (!visibleSteps.includes(body.step)) {
      return NextResponse.json(
        { error: "Step not available for your tier." },
        { status: 400 }
      );
    }
    const visIdx = visibleSteps.indexOf(body.step);
    const serverVisIdx = visibleSteps.indexOf(
      visibleSteps.find((i) => i >= serverCurrentStep) ?? serverCurrentStep
    );
    // Allow writing the current step or going backwards. Forward-jumps
    // beyond serverVisIdx + 1 are rejected.
    if (visIdx > serverVisIdx + 1) {
      return NextResponse.json(
        {
          error: "Cannot skip ahead — please complete earlier steps first.",
          canonicalStep: visibleSteps[serverVisIdx],
        },
        { status: 400 }
      );
    }

    // ── Per-step required-field validation (UF-007d) ──────────────────────
    const required = REQUIRED_FIELDS_PER_STEP[body.step] ?? [];
    const filteredData = pickAllowed(body.data);
    const missing: ProfileField[] = [];
    for (const field of required) {
      if (!isFieldComplete(filteredData[field])) {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields for this step.",
          missing,
        },
        { status: 400 }
      );
    }

    // ── Persist (UF-007b + UF-007c) ───────────────────────────────────────
    // Compute the next step in the visible order. If body.step is the last
    // visible step, nextStep is null and the client should call /complete.
    const nextStepIdx = visIdx + 1 < visibleSteps.length ? visibleSteps[visIdx + 1] : null;
    const newCurrentStep = nextStepIdx ?? body.step;

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        ...filteredData,
        onboarding_current_step: newCurrentStep,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      logApiError("api/onboarding/step:update", updateError);
      return NextResponse.json(
        { error: "Failed to save step." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      currentStep: newCurrentStep,
      nextStep: nextStepIdx,
      visibleSteps,
      tier,
    });
  } catch (err) {
    logApiError("api/onboarding/step", err);
    return NextResponse.json(
      { error: "Failed to save step." },
      { status: 500 }
    );
  }
}
