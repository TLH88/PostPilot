import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

/**
 * BP-099: Update the current user's `ui_mode` preference.
 *
 * Body: `{ mode: 'focus' | 'standard' }`
 *
 * RLS already restricts user_profiles writes to `auth.uid() = user_id`,
 * so the only authorization this route needs is "are you logged in."
 * The CHECK constraint on the column rejects any value other than the
 * two listed below; we still validate here so we return a clean 400
 * instead of a 500 surface for bad client input.
 */
const VALID_MODES = ["focus", "standard"] as const;
type UiMode = (typeof VALID_MODES)[number];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { mode?: unknown };
    const mode = body.mode;

    if (typeof mode !== "string" || !VALID_MODES.includes(mode as UiMode)) {
      return NextResponse.json(
        { error: "Invalid mode. Expected 'focus' or 'standard'." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        ui_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      logApiError("api/profile/ui-mode", updateError);
      return NextResponse.json(
        { error: "Failed to save preference" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mode });
  } catch (error) {
    logApiError("api/profile/ui-mode", error);
    return NextResponse.json(
      { error: "Failed to save preference" },
      { status: 500 }
    );
  }
}
