import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({
        linkedin_access_token_encrypted: null,
        linkedin_access_token_iv: null,
        linkedin_access_token_auth_tag: null,
        linkedin_refresh_token_encrypted: null,
        linkedin_refresh_token_iv: null,
        linkedin_refresh_token_auth_tag: null,
        linkedin_token_expires_at: null,
        linkedin_member_id: null,
        linkedin_connected_at: null,
      })
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/linkedin/disconnect", error);
    return NextResponse.json(
      { error: "Failed to disconnect LinkedIn" },
      { status: 500 }
    );
  }
}
