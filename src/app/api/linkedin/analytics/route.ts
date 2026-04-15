import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/encryption";
import { fetchPostEngagement, refreshLinkedInToken } from "@/lib/linkedin-api";
import { logApiError } from "@/lib/api-utils";
import type { CreatorProfile, Post } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the post
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (postError || !postData) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postData as Post;

    if (!post.linkedin_post_id) {
      return NextResponse.json(
        { error: "This post does not have a LinkedIn post ID. Analytics can only be fetched for posts published to LinkedIn." },
        { status: 400 }
      );
    }

    // Fetch creator profile with LinkedIn tokens
    const { data: profileData, error: profileError } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = profileData as CreatorProfile;

    // Check if user has the analytics scope
    if (!profile.linkedin_scopes?.includes("r_member_postAnalytics")) {
      return NextResponse.json(
        { error: "scope_required" },
        { status: 403 }
      );
    }

    // Check LinkedIn connection
    if (
      !profile.linkedin_access_token_encrypted ||
      !profile.linkedin_access_token_iv ||
      !profile.linkedin_access_token_auth_tag ||
      !profile.linkedin_member_id
    ) {
      return NextResponse.json(
        { error: "LinkedIn not connected. Please connect in Settings." },
        { status: 400 }
      );
    }

    // Decrypt access token
    let accessToken = decrypt({
      ciphertext: profile.linkedin_access_token_encrypted,
      iv: profile.linkedin_access_token_iv,
      authTag: profile.linkedin_access_token_auth_tag,
    });

    // Check token expiry and refresh if needed
    const tokenExpired =
      profile.linkedin_token_expires_at &&
      new Date(profile.linkedin_token_expires_at) < new Date();

    if (tokenExpired) {
      if (
        profile.linkedin_refresh_token_encrypted &&
        profile.linkedin_refresh_token_iv &&
        profile.linkedin_refresh_token_auth_tag
      ) {
        try {
          const refreshToken = decrypt({
            ciphertext: profile.linkedin_refresh_token_encrypted,
            iv: profile.linkedin_refresh_token_iv,
            authTag: profile.linkedin_refresh_token_auth_tag,
          });

          const newTokens = await refreshLinkedInToken(refreshToken);
          accessToken = newTokens.access_token;

          // Store refreshed tokens
          const encrypted = encrypt(newTokens.access_token);
          const updateData: Record<string, unknown> = {
            linkedin_access_token_encrypted: encrypted.ciphertext,
            linkedin_access_token_iv: encrypted.iv,
            linkedin_access_token_auth_tag: encrypted.authTag,
            linkedin_token_expires_at: new Date(
              Date.now() + newTokens.expires_in * 1000
            ).toISOString(),
          };

          if (newTokens.refresh_token) {
            const encRefresh = encrypt(newTokens.refresh_token);
            updateData.linkedin_refresh_token_encrypted = encRefresh.ciphertext;
            updateData.linkedin_refresh_token_iv = encRefresh.iv;
            updateData.linkedin_refresh_token_auth_tag = encRefresh.authTag;
          }

          await supabase
            .from("creator_profiles")
            .update(updateData)
            .eq("user_id", user.id);
        } catch {
          return NextResponse.json(
            { error: "LinkedIn connection expired. Please reconnect in Settings.", expired: true },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "LinkedIn connection expired. Please reconnect in Settings.", expired: true },
          { status: 401 }
        );
      }
    }

    // Fetch engagement data from LinkedIn
    const engagement = await fetchPostEngagement(
      accessToken,
      post.linkedin_post_id
    );

    // Update post with analytics data
    await supabase
      .from("posts")
      .update({
        impressions: engagement.impressions,
        reactions: engagement.reactions,
        comments_count: engagement.comments,
        reposts: engagement.reposts,
        engagements: engagement.engagements,
        analytics_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    return NextResponse.json(engagement);
  } catch (error) {
    logApiError("api/linkedin/analytics", error);

    const raw = error instanceof Error ? error.message : "";

    if (raw.includes("403") || raw.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: "scope_required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch analytics from LinkedIn" },
      { status: 500 }
    );
  }
}
