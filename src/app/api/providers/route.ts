import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

/**
 * Returns the active provider registry — the metadata source of truth
 * the settings UI uses to render dropdowns, capability badges, key
 * placeholders, and "Where do I find this?" help links.
 *
 * No request payload, authenticated only. RLS on `ai_providers` does
 * the gating (only `is_active=true` rows are returned to authenticated
 * users; service role can see everything).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_providers")
      .select("slug, label, placeholder, capabilities, help_url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ providers: data ?? [] });
  } catch (err) {
    logApiError("api/providers GET", err);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
