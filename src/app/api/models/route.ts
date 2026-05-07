import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";
import { getAllAdapters } from "@/lib/ai/adapters/registry";

/**
 * Returns the active model catalog grouped by provider.
 *
 * Query params:
 *   - kind=text|image  (optional, default 'text')
 *
 * Sources, in order of precedence:
 *   1. ai_models rows (live catalog refreshed by Test/Save flows + the
 *      daily refresh-models cron).
 *   2. Adapter `staticModels(kind)` fallback for any provider that has
 *      no DB rows for the requested kind. This guarantees the UI
 *      always has *something* to show even before any cron run or
 *      user-triggered refresh has populated the DB — important on
 *      day one of a new provider or a fresh kind ('image' rows had
 *      no DB seed). Owner reported 2026-05-07 that the image-gen
 *      model picker was empty for Google because no image rows
 *      existed yet; this fallback avoids that class of staleness.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const kindParam = searchParams.get("kind");
    const kind: "text" | "image" = kindParam === "image" ? "image" : "text";

    const { data, error } = await supabase
      .from("ai_models")
      .select("provider, model_id, label, is_default, sort_order")
      .eq("is_active", true)
      .eq("kind", kind)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Group DB rows by provider.
    const models: Record<
      string,
      { models: { value: string; label: string }[]; defaultModel: string }
    > = {};

    for (const row of data ?? []) {
      if (!models[row.provider]) {
        models[row.provider] = { models: [], defaultModel: "" };
      }
      models[row.provider].models.push({
        value: row.model_id,
        label: row.label,
      });
      if (row.is_default) {
        models[row.provider].defaultModel = row.model_id;
      }
    }

    // Static fallback per provider for any provider with no DB rows
    // for this kind. Adapters that don't support the kind return [],
    // so unsupported (provider, kind) pairs stay empty.
    for (const adapter of getAllAdapters()) {
      const slug = adapter.slug;
      if (models[slug] && models[slug].models.length > 0) continue;
      const staticList = adapter.staticModels(kind);
      if (staticList.length === 0) continue;
      models[slug] = {
        models: staticList,
        defaultModel: staticList[0].value,
      };
    }

    // Ensure each provider has a default (fallback to first model).
    for (const provider of Object.keys(models)) {
      if (!models[provider].defaultModel && models[provider].models.length > 0) {
        models[provider].defaultModel = models[provider].models[0].value;
      }
    }

    return NextResponse.json(models);
  } catch (error) {
    logApiError("api/models", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
