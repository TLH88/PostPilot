import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ai_models")
      .select("provider, model_id, label, is_default, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Group by provider
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

    // Ensure each provider has a default (fallback to first model)
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
