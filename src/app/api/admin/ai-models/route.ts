import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

/**
 * Returns the active list of AI models grouped by provider and kind.
 *
 * The ai_models table is populated/refreshed from the Vercel AI Gateway
 * via the existing model-sync mechanism (BP-117). This endpoint is the
 * source of truth for the admin "System AI Defaults" picker — the UI
 * gets exactly the same list of models that the runtime can actually
 * resolve through the gateway.
 */

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kind = req.nextUrl.searchParams.get("kind"); // "text" | "image" | null

  const supabase = createAdminClient();
  let query = supabase
    .from("ai_models")
    .select("provider, kind, model_id, label, is_default, sort_order")
    .eq("is_active", true)
    .order("kind", { ascending: true })
    .order("provider", { ascending: true })
    .order("sort_order", { ascending: true });

  if (kind === "text" || kind === "image") {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by provider so the UI can render a 2-level select cleanly.
  const byProvider: Record<string, { provider: string; kind: string; modelId: string; label: string; isDefault: boolean }[]> = {};
  for (const row of data ?? []) {
    const key = `${row.kind}:${row.provider}`;
    if (!byProvider[key]) byProvider[key] = [];
    byProvider[key].push({
      provider: row.provider,
      kind: row.kind,
      modelId: row.model_id,
      label: row.label,
      isDefault: row.is_default,
    });
  }

  return NextResponse.json({
    models: data ?? [],
    grouped: byProvider,
  });
}
