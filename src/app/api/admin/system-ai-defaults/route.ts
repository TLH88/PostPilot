import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

/**
 * Tier × kind matrix of default system AI provider+model selections.
 *
 * Replaces the singleton system_ai_config table. Free/Personal users
 * and Pro+ users can have separate text and image defaults.
 *
 * GET  — return the 4-row matrix.
 * POST — upsert a single (tier, kind) row. Validates that the model
 *        exists in ai_models and that the (provider, model) pair is
 *        consistent with the table.
 */

const TIERS = ["free_personal", "pro_plus"] as const;
const KINDS = ["text", "image"] as const;
const PROVIDERS = ["openai", "anthropic", "google", "perplexity"] as const;

const upsertSchema = z.object({
  tier: z.enum(TIERS),
  kind: z.enum(KINDS),
  provider: z.enum(PROVIDERS),
  model: z.string().min(1).max(200),
});

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("system_ai_defaults")
    .select("tier, kind, provider, model, updated_at, updated_by");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ defaults: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = upsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Validate the (provider, model, kind) tuple exists in ai_models.
  const { data: model } = await supabase
    .from("ai_models")
    .select("provider, kind, model_id, is_active")
    .eq("provider", parsed.data.provider)
    .eq("model_id", parsed.data.model)
    .eq("kind", parsed.data.kind)
    .maybeSingle();

  if (!model) {
    return NextResponse.json(
      {
        error: `Model "${parsed.data.provider}/${parsed.data.model}" is not registered for kind=${parsed.data.kind}. Make sure it's in ai_models.`,
      },
      { status: 400 },
    );
  }
  if (!model.is_active) {
    return NextResponse.json(
      { error: `Model "${parsed.data.provider}/${parsed.data.model}" is inactive — pick another.` },
      { status: 400 },
    );
  }

  const { data: upserted, error: upsertErr } = await supabase
    .from("system_ai_defaults")
    .upsert(
      {
        tier: parsed.data.tier,
        kind: parsed.data.kind,
        provider: parsed.data.provider,
        model: parsed.data.model,
        updated_at: new Date().toISOString(),
        updated_by: admin.id,
      },
      { onConflict: "tier,kind" },
    )
    .select()
    .single();

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  console.log(
    JSON.stringify({
      level: "info",
      context: "admin/system-ai-defaults",
      action: "upsert",
      adminEmail: admin.email,
      tier: parsed.data.tier,
      kind: parsed.data.kind,
      provider: parsed.data.provider,
      model: parsed.data.model,
      timestamp: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ default: upserted });
}
