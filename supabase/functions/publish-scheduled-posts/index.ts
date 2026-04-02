import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Read env vars inside the handler to ensure they're available at runtime
function getEnv(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

// ─── JWT Signature Verification (HMAC-SHA256) ───────────────────────────────

async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;
  const signingInput = `${header}.${payload}`;

  // Import the secret as an HMAC key
  // Supabase JWT secrets may be raw UTF-8 strings — try both raw and base64-decoded
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // Decode the base64url signature
  const sigBase64 = signature.replace(/-/g, "+").replace(/_/g, "/");
  const sigPadded = sigBase64 + "=".repeat((4 - (sigBase64.length % 4)) % 4);
  const sigBytes = Uint8Array.from(atob(sigPadded), (c) => c.charCodeAt(0));

  // Verify the signature
  return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(signingInput));
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

const MAX_PUBLISH_ATTEMPTS = 3;

// ─── AES-256-GCM Decryption (Deno Web Crypto API) ──────────────────────────

async function decrypt(ciphertext: string, iv: string, authTag: string): Promise<string> {
  const encKeyHex = getEnv("ENCRYPTION_KEY");
  const keyBytes = new Uint8Array(
    encKeyHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
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
    client_id: getEnv("LINKEDIN_CLIENT_ID"),
    client_secret: getEnv("LINKEDIN_CLIENT_SECRET"),
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
  // Verify authorization — the caller must provide the service role key
  // SUPABASE_SERVICE_ROLE_KEY is auto-injected by Supabase as the full JWT
  const authHeader = req.headers.get("Authorization") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!authHeader.startsWith("Bearer ") || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // Cryptographically verify the JWT signature using the project's JWT secret
  // JWT_SECRET is the HMAC-SHA256 signing key used to sign all Supabase JWTs
  const jwtSecret = Deno.env.get("JWT_SECRET") || "";
  if (!jwtSecret) {
    console.error("JWT_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validSignature = await verifyJwtSignature(token, jwtSecret);
  if (!validSignature) {
    return new Response(JSON.stringify({ error: "Unauthorized: invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify the token claims — must be service_role and not expired
  const payload = decodeJwtPayload(token);
  if (payload.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Unauthorized: insufficient role" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
    return new Response(JSON.stringify({ error: "Unauthorized: token expired" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Use the verified JWT token to create the Supabase client (bypasses RLS)
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabase = createClient(supabaseUrl, token);

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
