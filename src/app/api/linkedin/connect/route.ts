import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "LinkedIn client ID not configured" },
        { status: 500 }
      );
    }

    const state = crypto.randomUUID();
    // Use the Host header to get the actual domain the user is on
    // (works correctly for both production and preview deployments)
    const host = request.headers.get("host") || request.nextUrl.host;
    const protocol = host.includes("localhost") ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/linkedin/callback`;

    const authUrl = new URL(
      "https://www.linkedin.com/oauth/v2/authorization"
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "openid profile w_member_social");

    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set("linkedin_oauth_state", state, {
      maxAge: 600,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    logApiError("api/linkedin/connect", error);
    return NextResponse.json(
      { error: "Failed to initiate LinkedIn connection" },
      { status: 500 }
    );
  }
}
