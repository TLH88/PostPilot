import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("creator_profiles")
      .select(
        "linkedin_connected_at, linkedin_token_expires_at, linkedin_member_id"
      )
      .eq("user_id", user.id)
      .single();

    if (error) {
      throw error;
    }

    const connected = profile?.linkedin_connected_at !== null;
    const expiresAt = profile?.linkedin_token_expires_at ?? null;
    const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
    const memberId = profile?.linkedin_member_id ?? null;

    return NextResponse.json({
      connected,
      expiresAt,
      expired,
      memberId,
    });
  } catch (error) {
    logApiError("api/linkedin/status", error);
    return NextResponse.json(
      { error: "Failed to check LinkedIn status" },
      { status: 500 }
    );
  }
}
