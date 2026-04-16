import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { publishToLinkedIn, uploadImageToLinkedIn, refreshLinkedInToken } from "@/lib/linkedin-api";
import { encrypt } from "@/lib/encryption";
import { logApiError } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
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

    // Fetch post
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

    if (!post.content?.trim()) {
      return NextResponse.json(
        { error: "Post has no content to publish" },
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
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const profile = profileData as CreatorProfile;

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

    // Check token expiry
    const tokenExpired =
      profile.linkedin_token_expires_at &&
      new Date(profile.linkedin_token_expires_at) < new Date();

    if (tokenExpired) {
      // Try refresh if available
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
        } catch (refreshError) {
          const msg =
            refreshError instanceof Error ? refreshError.message : "";
          // Distinguish true expiry from temporary failures
          const isTemporary =
            msg.includes("ECONNRESET") ||
            msg.includes("ETIMEDOUT") ||
            msg.includes("fetch failed") ||
            msg.includes("network");

          if (isTemporary) {
            return NextResponse.json(
              {
                error:
                  "Could not reach LinkedIn to refresh your connection. Please try again.",
                action: "This may be a temporary network issue.",
              },
              { status: 502 }
            );
          }

          return NextResponse.json(
            {
              error:
                "LinkedIn connection expired. Please reconnect in Settings.",
              expired: true,
            },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          {
            error: "LinkedIn connection expired. Please reconnect in Settings.",
            expired: true,
          },
          { status: 401 }
        );
      }
    }

    // Upload image to LinkedIn if post has one
    let imageUrn: string | null = null;
    if (post.image_url) {
      try {
        const imageRes = await fetch(post.image_url);
        if (imageRes.ok) {
          const imageBuffer = await imageRes.arrayBuffer();
          const contentType = imageRes.headers.get("content-type") || "image/jpeg";
          imageUrn = await uploadImageToLinkedIn(
            accessToken,
            profile.linkedin_member_id,
            imageBuffer,
            contentType
          );
        }
      } catch (imgError) {
        // Log but don't block — publish text-only if image upload fails
        console.error("Image upload to LinkedIn failed:", imgError);
      }
    }

    // Publish to LinkedIn
    const result = await publishToLinkedIn(
      accessToken,
      profile.linkedin_member_id,
      post.content,
      post.hashtags ?? [],
      post.title,
      imageUrn
    );

    // Update post with LinkedIn info
    await supabase
      .from("posts")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        publish_method: post.scheduled_for ? "scheduled" : "direct",
        linkedin_post_id: result.postId,
        linkedin_post_url: result.postUrl,
        publish_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    // Log post_published activity
    await logActivity(supabase, {
      user_id: user.id,
      workspace_id: post.workspace_id,
      post_id: post.id,
      action: "post_published",
      details: { linkedin_post_id: result.postId, method: post.scheduled_for ? "scheduled" : "direct" },
    });

    // Notify author if someone else published (e.g., admin / scheduled job via different user)
    if (post.user_id && post.user_id !== user.id) {
      await createNotification(supabase, {
        user_id: post.user_id,
        workspace_id: post.workspace_id,
        type: "post_published",
        title: "Your post was published",
        body: `"${post.title ?? "Untitled"}" is now live on LinkedIn`,
        action_url: `/posts/${post.id}/published`,
        post_id: post.id,
        triggered_by: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      linkedinPostId: result.postId,
      linkedinPostUrl: result.postUrl,
    });
  } catch (error) {
    logApiError("api/linkedin/publish", error);

    const raw = error instanceof Error ? error.message : "Failed to publish to LinkedIn";

    // Parse LinkedIn API error for user-friendly message
    let message = "Failed to publish to LinkedIn.";
    let action = "Try again. If this keeps happening, reconnect LinkedIn in Settings.";

    if (raw.includes("NONEXISTENT_VERSION")) {
      message = "LinkedIn API version error.";
      action = "Please report this issue — the API version needs updating.";
    } else if (raw.includes("401") || raw.includes("UNAUTHORIZED") || raw.includes("expired")) {
      message = "Your LinkedIn connection has expired.";
      action = "Go to Settings and reconnect your LinkedIn account.";
    } else if (raw.includes("403") || raw.includes("FORBIDDEN") || raw.includes("ACCESS_DENIED")) {
      message = "LinkedIn denied permission to post.";
      action = "Reconnect LinkedIn in Settings and make sure you grant posting permissions.";
    } else if (raw.includes("429") || raw.includes("THROTTLE")) {
      message = "LinkedIn rate limit reached.";
      action = "Wait a few minutes and try again.";
    } else if (raw.includes("DUPLICATE")) {
      message = "LinkedIn detected this as a duplicate post.";
      action = "Edit the content to make it unique, then try again.";
    } else if (raw.includes("CONTENT_TOO_LONG") || raw.includes("too long")) {
      message = "Your post exceeds LinkedIn's character limit.";
      action = "Shorten your post content and try again.";
    }

    return NextResponse.json({ error: message, action }, { status: 500 });
  }
}
