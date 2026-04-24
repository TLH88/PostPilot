import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  getLinkedInMemberId,
  refreshLinkedInToken,
} from "@/lib/linkedin-api";
import { logApiError } from "@/lib/api-utils";

/**
 * Validate the stored LinkedIn access token by making a live call to
 * LinkedIn's /v2/userinfo endpoint. This catches tokens that were revoked by
 * the user on LinkedIn's side — something our expiry timestamp alone cannot
 * detect.
 *
 * Throttled to at most one real API call per user per hour via
 * user_profiles.linkedin_token_validated_at.
 *
 * Response shape:
 *   { valid: true,  cached: boolean }
 *   { valid: false, reason: "not_connected" | "no_token" | "revoked" | "refresh_failed" }
 *
 * The access token is never returned. Errors from LinkedIn are never echoed
 * back verbatim.
 */
const THROTTLE_MS = 60 * 60 * 1000; // 1 hour

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select(
        "linkedin_connected_at, linkedin_token_expires_at, linkedin_token_validated_at, linkedin_access_token_encrypted, linkedin_access_token_iv, linkedin_access_token_auth_tag, linkedin_refresh_token_encrypted, linkedin_refresh_token_iv, linkedin_refresh_token_auth_tag"
      )
      .eq("user_id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { valid: false, reason: "not_connected" as const },
        { status: 200 }
      );
    }

    if (!profile.linkedin_connected_at) {
      return NextResponse.json(
        { valid: false, reason: "not_connected" as const },
        { status: 200 }
      );
    }

    // Throttle: if we validated recently, skip the LinkedIn call.
    const lastValidated =
      (profile as { linkedin_token_validated_at?: string | null })
        .linkedin_token_validated_at;
    if (lastValidated) {
      const age = Date.now() - new Date(lastValidated).getTime();
      if (age >= 0 && age < THROTTLE_MS) {
        return NextResponse.json({ valid: true, cached: true });
      }
    }

    const hasAccess =
      profile.linkedin_access_token_encrypted &&
      profile.linkedin_access_token_iv &&
      profile.linkedin_access_token_auth_tag;
    if (!hasAccess) {
      return NextResponse.json(
        { valid: false, reason: "no_token" as const },
        { status: 200 }
      );
    }

    let accessToken = decrypt({
      ciphertext: profile.linkedin_access_token_encrypted!,
      iv: profile.linkedin_access_token_iv!,
      authTag: profile.linkedin_access_token_auth_tag!,
    });

    // Attempt the live validation call.
    try {
      await getLinkedInMemberId(accessToken);
      await supabase
        .from("user_profiles")
        .update({ linkedin_token_validated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      return NextResponse.json({ valid: true, cached: false });
    } catch (err) {
      logApiError("api/linkedin/validate userinfo", err);
      // First attempt failed. Try a refresh if we have a refresh token,
      // mirroring the resilience we already have in /api/linkedin/status.
      const hasRefresh =
        profile.linkedin_refresh_token_encrypted &&
        profile.linkedin_refresh_token_iv &&
        profile.linkedin_refresh_token_auth_tag;

      if (hasRefresh) {
        try {
          const refreshToken = decrypt({
            ciphertext: profile.linkedin_refresh_token_encrypted!,
            iv: profile.linkedin_refresh_token_iv!,
            authTag: profile.linkedin_refresh_token_auth_tag!,
          });
          const newTokens = await refreshLinkedInToken(refreshToken);
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
            updateData.linkedin_refresh_token_encrypted = encRefresh.ciphertext;
            updateData.linkedin_refresh_token_iv = encRefresh.iv;
            updateData.linkedin_refresh_token_auth_tag = encRefresh.authTag;
          }
          await supabase
            .from("user_profiles")
            .update(updateData)
            .eq("user_id", user.id);

          accessToken = newTokens.access_token;

          // Retry userinfo with the refreshed token.
          await getLinkedInMemberId(accessToken);
          await supabase
            .from("user_profiles")
            .update({ linkedin_token_validated_at: new Date().toISOString() })
            .eq("user_id", user.id);
          return NextResponse.json({ valid: true, cached: false });
        } catch (refreshErr) {
          logApiError("api/linkedin/validate refresh", refreshErr);
          await markDisconnected(supabase, user.id);
          return NextResponse.json(
            { valid: false, reason: "refresh_failed" as const },
            { status: 200 }
          );
        }
      }

      // No refresh token available — the token is revoked.
      await markDisconnected(supabase, user.id);
      return NextResponse.json(
        { valid: false, reason: "revoked" as const },
        { status: 200 }
      );
    }
  } catch (error) {
    logApiError("api/linkedin/validate", error);
    // Fail closed to "unknown" rather than leaking — client treats this the
    // same as a connection error and does not disrupt the UI.
    return NextResponse.json(
      { error: "Failed to validate LinkedIn connection" },
      { status: 500 }
    );
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function markDisconnected(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Clear connection + token columns so the rest of the app reads this as
  // disconnected. Tokens stay encrypted-at-rest but are no longer usable
  // because we null out the pointers and mark the connection as absent.
  await supabase
    .from("user_profiles")
    .update({
      linkedin_connected_at: null,
      linkedin_token_expires_at: null,
      linkedin_member_id: null,
      linkedin_access_token_encrypted: null,
      linkedin_access_token_iv: null,
      linkedin_access_token_auth_tag: null,
      linkedin_refresh_token_encrypted: null,
      linkedin_refresh_token_iv: null,
      linkedin_refresh_token_auth_tag: null,
      linkedin_token_validated_at: null,
    })
    .eq("user_id", userId);
}
