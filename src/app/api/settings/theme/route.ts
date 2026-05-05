/**
 * Theme preference API.
 *
 * POST /api/settings/theme — write the current user's theme choice to
 * user_profiles.theme_preference. Used by `<ThemePersistence />` to keep
 * the DB in sync with next-themes' localStorage value, so signing in on
 * a new browser restores the user's saved theme rather than falling back
 * to the app default ("dark").
 *
 * Auth: user-scoped (server client). RLS on user_profiles ensures the
 * update only affects the caller's row even though we filter explicitly.
 *
 * Failure mode: best-effort. The client UI has already applied the theme
 * via next-themes; a 500 here only means cross-device persistence didn't
 * stick this time. The next theme change will retry.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

const ThemeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ThemeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid theme", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ theme_preference: parsed.data.theme })
      .eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("api/settings/theme", error);
    return NextResponse.json(
      { error: "Failed to save theme preference" },
      { status: 500 },
    );
  }
}
