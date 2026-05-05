import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/encryption";
import { LinkedInApiError, refreshLinkedInToken } from "@/lib/linkedin-api";
import { logApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const supabase = await createClient();

    // Newer @supabase/ssr versions throw `AuthApiError` for malformed /
    // expired JWT cookies instead of returning `{ user: null }`. Wrap the
    // call so we surface the same clean 401 the !user branch already uses,
    // rather than bubbling to the generic 500 handler. (Same pattern as
    // /api/linkedin/validate; matches the only failure mode that survived
    // the data audit on 2026-05-05.)
    let user;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select(
        "linkedin_connected_at, linkedin_token_expires_at, linkedin_member_id, linkedin_access_token_encrypted, linkedin_access_token_iv, linkedin_access_token_auth_tag, linkedin_refresh_token_encrypted, linkedin_refresh_token_iv, linkedin_refresh_token_auth_tag"
      )
      .eq("user_id", user.id)
      .single();

    if (error) {
      throw error;
    }

    const connected = profile?.linkedin_connected_at !== null;
    let expiresAt = profile?.linkedin_token_expires_at ?? null;
    let expired = expiresAt ? new Date(expiresAt) < new Date() : false;
    const memberId = profile?.linkedin_member_id ?? null;

    // If token is expired but we have a refresh token, try proactive refresh
    if (connected && expired && profile) {
      const hasRefreshToken =
        profile.linkedin_refresh_token_encrypted &&
        profile.linkedin_refresh_token_iv &&
        profile.linkedin_refresh_token_auth_tag;

      if (hasRefreshToken) {
        try {
          const refreshToken = decrypt({
            ciphertext: profile.linkedin_refresh_token_encrypted!,
            iv: profile.linkedin_refresh_token_iv!,
            authTag: profile.linkedin_refresh_token_auth_tag!,
          });

          const newTokens = await refreshLinkedInToken(refreshToken);

          // Store refreshed tokens
          const encryptedAccess = encrypt(newTokens.access_token);
          const newExpiresAt = new Date(
            Date.now() + newTokens.expires_in * 1000
          ).toISOString();

          const updateData: Record<string, unknown> = {
            linkedin_access_token_encrypted: encryptedAccess.ciphertext,
            linkedin_access_token_iv: encryptedAccess.iv,
            linkedin_access_token_auth_tag: encryptedAccess.authTag,
            linkedin_token_expires_at: newExpiresAt,
          };

          if (newTokens.refresh_token) {
            const encRefresh = encrypt(newTokens.refresh_token);
            updateData.linkedin_refresh_token_encrypted =
              encRefresh.ciphertext;
            updateData.linkedin_refresh_token_iv = encRefresh.iv;
            updateData.linkedin_refresh_token_auth_tag = encRefresh.authTag;
          }

          await supabase
            .from("user_profiles")
            .update(updateData)
            .eq("user_id", user.id);

          // Token successfully refreshed — update response values
          expiresAt = newExpiresAt;
          expired = false;
        } catch (refreshErr) {
          // Transient refresh errors (5xx, 429, network) should not flip the
          // banner to "expired" — leave the prior expiresAt and let the
          // client treat the connection as still good. Only mark expired
          // when LinkedIn definitively rejects the refresh token.
          if (
            refreshErr instanceof LinkedInApiError &&
            refreshErr.isTransient
          ) {
            console.warn(
              JSON.stringify({
                level: "warn",
                context: "api/linkedin/status refresh",
                userId: user.id,
                transient: true,
                status: refreshErr.status,
                linkedinError: refreshErr.linkedinError,
                message: refreshErr.message,
                timestamp: new Date().toISOString(),
              })
            );
            expired = false;
          }
          // Else: leave expired = true so the banner surfaces the disconnect.
        }
      }
    }

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
