import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getLinkedInMemberId } from "@/lib/linkedin-api";
import { encrypt } from "@/lib/encryption";
import { logApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/settings", request.nextUrl.origin);

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get("linkedin_oauth_state")?.value;

    // Clear state cookie immediately
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.set("linkedin_oauth_state", "", {
      maxAge: 0,
      path: "/",
    });

    if (!code || !state || !storedState || state !== storedState) {
      settingsUrl.searchParams.set("linkedin", "error");
      return NextResponse.redirect(settingsUrl);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/linkedin/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get the LinkedIn member ID
    const memberId = await getLinkedInMemberId(tokens.access_token);

    // Encrypt the access token
    const encryptedAccess = encrypt(tokens.access_token);

    // Calculate expiration
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Parse granted scopes from token response
    const grantedScopes = tokens.scope
      ? tokens.scope.split(/[\s,]+/).filter(Boolean)
      : [];

    // Build the update object
    const updateData: Record<string, string | string[] | null> = {
      linkedin_access_token_encrypted: encryptedAccess.ciphertext,
      linkedin_access_token_iv: encryptedAccess.iv,
      linkedin_access_token_auth_tag: encryptedAccess.authTag,
      linkedin_token_expires_at: expiresAt,
      linkedin_member_id: memberId,
      linkedin_connected_at: new Date().toISOString(),
      linkedin_scopes: grantedScopes.length > 0 ? grantedScopes : null,
    };

    // Encrypt refresh token if present
    if (tokens.refresh_token) {
      const encryptedRefresh = encrypt(tokens.refresh_token);
      updateData.linkedin_refresh_token_encrypted = encryptedRefresh.ciphertext;
      updateData.linkedin_refresh_token_iv = encryptedRefresh.iv;
      updateData.linkedin_refresh_token_auth_tag = encryptedRefresh.authTag;
    } else {
      updateData.linkedin_refresh_token_encrypted = null;
      updateData.linkedin_refresh_token_iv = null;
      updateData.linkedin_refresh_token_auth_tag = null;
    }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    settingsUrl.searchParams.set("linkedin", "connected");
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    logApiError("api/linkedin/callback", error);
    settingsUrl.searchParams.set("linkedin", "error");
    return NextResponse.redirect(settingsUrl);
  }
}
