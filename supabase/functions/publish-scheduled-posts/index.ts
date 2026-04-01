import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY_HEX = Deno.env.get("ENCRYPTION_KEY")!;
const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID")!;
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;

const MAX_PUBLISH_ATTEMPTS = 3;

// ─── AES-256-GCM Decryption (Deno Web Crypto API) ──────────────────────────

async function decrypt(ciphertext: string, iv: string, authTag: string): Promise<string> {
  const keyBytes = new Uint8Array(
    ENCRYPTION_KEY_HEX.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const authTagBytes = Uint8Array.from(atob(authTag), (c) => c.charCodeAt(0));

  // AES-GCM expects ciphertext + authTag concatenated
  const combined = new Uint8Array(ciphertextBytes.length + authTagBytes.length);
  combined.set(ciphertextBytes);
  combined.set(authTagBytes, ciphertextBytes.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}

// ─── LinkedIn API ───────────────────────────────────────────────────────────

async function publishToLinkedIn(
  accessToken: string,
  memberId: string,
  content: string,
  hashtags: string[]
): Promise<{ postId: string; postUrl: string }> {
  const hashtagText = hashtags
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");
  const fullText = hashtagText ? `${content}\n\n${hashtagText}` : content;

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202604",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary: fullText,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn publish failed (${response.status}): ${error}`);
  }

  const postUrn = response.headers.get("x-restli-id") || "";
  const postUrl = `https://www.linkedin.com/feed/update/${postUrn}/`;

  return { postId: postUrn, postUrl };
}

async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET,
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return await response.json();
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Verify authorization via service role key or anon key with valid JWT
  const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Accept either the service role key directly, or a valid service role JWT
  // Supabase auto-injects SUPABASE_SERVICE_ROLE_KEY; pg_cron sends it via net.http_post
  if (authHeader !== expectedKey) {
    // Check if the token is a valid JWT with service_role claim
    try {
      const payload = JSON.parse(atob(authHeader.split(".")[1]));
      if (payload.role !== "service_role") {
        return new Response(JSON.stringify({ error: "Unauthorized: not service role" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find posts that are scheduled and past due (within 10-minute window)
  const { data: posts, error: queryError } = await supabase
    .from("posts")
    .select("id, content, hashtags, user_id, publish_attempts")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .gte("scheduled_for", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .lt("publish_attempts", MAX_PUBLISH_ATTEMPTS);

  if (queryError) {
    console.error("Query error:", queryError);
    return new Response(
      JSON.stringify({ error: "Failed to query scheduled posts", details: queryError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!posts || posts.length === 0) {
    return new Response(
      JSON.stringify({ message: "No posts to publish", count: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const results: Array<{ postId: string; status: string; error?: string }> = [];

  for (const post of posts) {
    // Fetch the creator profile for this post's user
    const { data: profileData } = await supabase
      .from("creator_profiles")
      .select(
        "linkedin_access_token_encrypted, linkedin_access_token_iv, linkedin_access_token_auth_tag, linkedin_refresh_token_encrypted, linkedin_refresh_token_iv, linkedin_refresh_token_auth_tag, linkedin_token_expires_at, linkedin_member_id"
      )
      .eq("user_id", post.user_id)
      .single();

    const profile = profileData as Record<string, string | null> | null;

    // Check if LinkedIn is connected
    if (
      !profile ||
      !profile.linkedin_access_token_encrypted ||
      !profile.linkedin_access_token_iv ||
      !profile.linkedin_access_token_auth_tag ||
      !profile.linkedin_member_id
    ) {
      await supabase
        .from("posts")
        .update({
          status: "past_due",
          publish_error: "LinkedIn not connected. Please connect in Settings and reschedule.",
          publish_attempts: (post.publish_attempts || 0) + 1,
        })
        .eq("id", post.id);

      results.push({ postId: post.id, status: "skipped", error: "LinkedIn not connected" });
      continue;
    }

    try {
      // Decrypt access token
      let accessToken = await decrypt(
        profile.linkedin_access_token_encrypted!,
        profile.linkedin_access_token_iv!,
        profile.linkedin_access_token_auth_tag!
      );

      // Check token expiry
      const tokenExpired =
        profile.linkedin_token_expires_at &&
        new Date(profile.linkedin_token_expires_at) < new Date();

      if (tokenExpired) {
        // Try refresh
        if (
          profile.linkedin_refresh_token_encrypted &&
          profile.linkedin_refresh_token_iv &&
          profile.linkedin_refresh_token_auth_tag
        ) {
          try {
            const refreshToken = await decrypt(
              profile.linkedin_refresh_token_encrypted,
              profile.linkedin_refresh_token_iv,
              profile.linkedin_refresh_token_auth_tag
            );
            const newTokens = await refreshLinkedInToken(refreshToken);
            accessToken = newTokens.access_token;
            // Note: We can't re-encrypt and store here easily without the Node crypto
            // Token refresh updates should be handled by the main app
          } catch (refreshError) {
            await supabase
              .from("posts")
              .update({
                status: "past_due",
                publish_error: "LinkedIn connection expired. Please reconnect in Settings.",
                publish_attempts: MAX_PUBLISH_ATTEMPTS, // Don't retry
              })
              .eq("id", post.id);

            results.push({ postId: post.id, status: "failed", error: "Token expired, refresh failed" });
            continue;
          }
        } else {
          // No refresh token, mark as past due
          await supabase
            .from("posts")
            .update({
              status: "past_due",
              publish_error: "LinkedIn connection expired. Please reconnect in Settings.",
              publish_attempts: MAX_PUBLISH_ATTEMPTS,
            })
            .eq("id", post.id);

          results.push({ postId: post.id, status: "failed", error: "Token expired, no refresh token" });
          continue;
        }
      }

      // Publish
      const result = await publishToLinkedIn(
        accessToken,
        profile.linkedin_member_id!,
        post.content,
        post.hashtags || []
      );

      // Success — update post
      await supabase
        .from("posts")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          linkedin_post_id: result.postId,
          linkedin_post_url: result.postUrl,
          publish_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      results.push({ postId: post.id, status: "published" });
      console.log(`Published post ${post.id}: ${result.postUrl}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const newAttempts = (post.publish_attempts || 0) + 1;
      const isAuthError = errorMsg.includes("401") || errorMsg.includes("403");

      await supabase
        .from("posts")
        .update({
          status: newAttempts >= MAX_PUBLISH_ATTEMPTS || isAuthError ? "past_due" : "scheduled",
          publish_error: errorMsg,
          publish_attempts: isAuthError ? MAX_PUBLISH_ATTEMPTS : newAttempts,
        })
        .eq("id", post.id);

      results.push({ postId: post.id, status: "failed", error: errorMsg });
      console.error(`Failed to publish post ${post.id}:`, errorMsg);
    }
  }

  return new Response(
    JSON.stringify({ message: "Done", count: posts.length, results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
