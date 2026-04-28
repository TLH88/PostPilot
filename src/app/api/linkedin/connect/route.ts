import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

// BP-145: Allowlist of return_to prefixes for the OAuth round-trip. Anything
// not on this list is rejected to prevent open-redirect via the
// linkedin_recovery_context cookie.
const RETURN_TO_ALLOWLIST = ["/posts/recovery", "/posts", "/calendar", "/dashboard", "/settings"];

function isSafeReturnTo(value: string | null): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  // Reject protocol-relative URLs (//evil.com)
  if (value.startsWith("//")) return false;
  return RETURN_TO_ALLOWLIST.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}?`) || value.startsWith(`${prefix}/`)
  );
}

const POST_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

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
    // Note: r_member_postAnalytics is needed for auto-fetching engagement data
    // but requires LinkedIn app approval. Add it back once approved.
    // For now, only request scopes the app already has.
    authUrl.searchParams.set("scope", "openid profile w_member_social");

    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set("linkedin_oauth_state", state, {
      maxAge: 600,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // BP-145: optional recovery context — when the user is reconnecting in
    // response to a failed scheduled post, stash where to send them after
    // the callback completes (defaults to /settings if absent). The cookie is
    // cleared in the callback, so it can never leak across OAuth flows.
    const returnTo = request.nextUrl.searchParams.get("return_to");
    const recoverPostId = request.nextUrl.searchParams.get("recover");

    if (isSafeReturnTo(returnTo)) {
      const safePostId =
        recoverPostId && POST_ID_PATTERN.test(recoverPostId) ? recoverPostId : "";
      const ctx = JSON.stringify({ return_to: returnTo, recover_post_id: safePostId });
      response.cookies.set("linkedin_recovery_context", ctx, {
        maxAge: 600,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error) {
    logApiError("api/linkedin/connect", error);
    return NextResponse.json(
      { error: "Failed to initiate LinkedIn connection" },
      { status: 500 }
    );
  }
}
