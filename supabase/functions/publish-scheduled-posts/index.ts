import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

/** Structured log — always includes timestamp and context for traceability */
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(data || {}),
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ─── JWT Signature Verification (HMAC-SHA256) ───────────────────────────────

async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;
  const signingInput = `${header}.${payload}`;

  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBase64 = signature.replace(/-/g, "+").replace(/_/g, "/");
  const sigPadded = sigBase64 + "=".repeat((4 - (sigBase64.length % 4)) % 4);
  const sigBytes = Uint8Array.from(atob(sigPadded), (c) => c.charCodeAt(0));

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

/**
 * BP-100: Upload an image to LinkedIn and return its URN.
 *
 * Mirrors `uploadImageToLinkedIn()` in src/lib/linkedin-api.ts. Two-step flow:
 *   1. POST /rest/images?action=initializeUpload — register the image asset
 *      (returns an upload URL and the image URN).
 *   2. PUT the binary to the upload URL.
 *
 * The returned URN is what gets attached to the post via `content.media.id`.
 */
async function uploadImageToLinkedIn(
  accessToken: string,
  memberId: string,
  imageBuffer: ArrayBuffer,
  contentType: string
): Promise<string> {
  // Step 1: Initialize upload
  const initResponse = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202602",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${memberId}`,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`LinkedIn image init failed (${initResponse.status}): ${error}`);
  }

  const initData = await initResponse.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn did not return upload URL or image URN");
  }

  // Step 2: Upload binary
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`LinkedIn image upload failed (${uploadResponse.status}): ${error}`);
  }

  return imageUrn;
}

async function publishToLinkedIn(
  accessToken: string,
  memberId: string,
  content: string,
  hashtags: string[],
  title?: string | null,
  imageUrn?: string | null
): Promise<{ postId: string; postUrl: string }> {
  const hashtagText = hashtags
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");

  // Prepend title as a first line if provided
  const bodyWithTitle =
    title && title !== "Untitled Post"
      ? `${title}\n\n${content}`
      : content;

  const fullText = hashtagText
    ? `${bodyWithTitle}\n\n${hashtagText}`
    : bodyWithTitle;

  // BP-100: Build post body — with or without image. Same shape as the
  // manual-publish route in src/app/api/linkedin/publish/route.ts.
  const postBody: Record<string, unknown> = {
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
  };

  if (imageUrn) {
    postBody.content = {
      media: {
        id: imageUrn,
      },
    };
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202602",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postBody),
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

// ─── Safe DB Update (logs failures instead of silently dropping them) ───────

async function safeUpdatePost(
  supabase: ReturnType<typeof createClient>,
  postId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId);

  if (error) {
    log("error", `DB update failed for post ${postId}`, {
      postId,
      updates: JSON.stringify(updates),
      dbError: error.message,
      dbCode: error.code,
      dbDetails: error.details,
    });
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Wrap EVERYTHING in a top-level try/catch so no error is ever silent
  try {
    log("info", "Edge Function invoked");

    // ── Auth verification ─────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!authHeader.startsWith("Bearer ") || !serviceRoleKey) {
      log("warn", "Missing auth header or service role key");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const jwtSecret = Deno.env.get("JWT_SECRET") || "";
    if (!jwtSecret) {
      log("error", "JWT_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured: JWT_SECRET missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validSignature = await verifyJwtSignature(token, jwtSecret);
    if (!validSignature) {
      log("warn", "JWT signature verification failed");
      return new Response(JSON.stringify({ error: "Unauthorized: invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = decodeJwtPayload(token);
    if (payload.role !== "service_role") {
      log("warn", "JWT role is not service_role", { role: String(payload.role) });
      return new Response(JSON.stringify({ error: "Unauthorized: insufficient role" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
      log("warn", "JWT token expired", { exp: payload.exp });
      return new Response(JSON.stringify({ error: "Unauthorized: token expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Query scheduled posts ─────────────────────────────────────────────
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabase = createClient(supabaseUrl, token);

    const now = new Date().toISOString();
    const { data: posts, error: queryError } = await supabase
      .from("posts")
      .select("id, title, content, hashtags, user_id, publish_attempts, image_url")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .lt("publish_attempts", MAX_PUBLISH_ATTEMPTS);

    if (queryError) {
      log("error", "Failed to query scheduled posts", {
        dbError: queryError.message,
        dbCode: queryError.code,
      });
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

    log("info", `Found ${posts.length} post(s) to publish`);

    const results: Array<{ postId: string; status: string; error?: string }> = [];

    // ── Process each post ─────────────────────────────────────────────────
    for (const post of posts) {
      const postLog = (level: "info" | "warn" | "error", msg: string, data?: Record<string, unknown>) =>
        log(level, `[post:${post.id}] ${msg}`, { postId: post.id, userId: post.user_id, ...data });

      try {
        // Fetch creator profile
        const { data: profileData, error: profileError } = await supabase
          .from("creator_profiles")
          .select(
            "linkedin_access_token_encrypted, linkedin_access_token_iv, linkedin_access_token_auth_tag, linkedin_refresh_token_encrypted, linkedin_refresh_token_iv, linkedin_refresh_token_auth_tag, linkedin_token_expires_at, linkedin_member_id"
          )
          .eq("user_id", post.user_id)
          .single();

        if (profileError) {
          postLog("error", "Failed to fetch creator profile", { dbError: profileError.message });
          await safeUpdatePost(supabase, post.id, {
            status: "past_due",
            publish_error: `Failed to fetch profile: ${profileError.message}`,
            publish_attempts: (post.publish_attempts || 0) + 1,
          });
          results.push({ postId: post.id, status: "failed", error: `Profile fetch error: ${profileError.message}` });
          continue;
        }

        const profile = profileData as Record<string, string | null> | null;

        // Check LinkedIn connection
        if (
          !profile ||
          !profile.linkedin_access_token_encrypted ||
          !profile.linkedin_access_token_iv ||
          !profile.linkedin_access_token_auth_tag ||
          !profile.linkedin_member_id
        ) {
          postLog("warn", "LinkedIn not connected for user");
          await safeUpdatePost(supabase, post.id, {
            status: "past_due",
            publish_error: "LinkedIn not connected. Please connect in Settings and reschedule.",
            publish_attempts: (post.publish_attempts || 0) + 1,
          });
          results.push({ postId: post.id, status: "skipped", error: "LinkedIn not connected" });
          continue;
        }

        // Decrypt access token
        let accessToken: string;
        try {
          accessToken = await decrypt(
            profile.linkedin_access_token_encrypted!,
            profile.linkedin_access_token_iv!,
            profile.linkedin_access_token_auth_tag!
          );
        } catch (decryptError) {
          const msg = decryptError instanceof Error ? decryptError.message : "Decryption failed";
          postLog("error", "Failed to decrypt LinkedIn access token", { decryptError: msg });
          await safeUpdatePost(supabase, post.id, {
            status: "past_due",
            publish_error: `Token decryption failed: ${msg}`,
            publish_attempts: MAX_PUBLISH_ATTEMPTS,
          });
          results.push({ postId: post.id, status: "failed", error: `Decrypt error: ${msg}` });
          continue;
        }

        // Check token expiry and refresh if needed
        const tokenExpired =
          profile.linkedin_token_expires_at &&
          new Date(profile.linkedin_token_expires_at) < new Date();

        if (tokenExpired) {
          postLog("info", "LinkedIn token expired, attempting refresh");

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
              postLog("info", "LinkedIn token refreshed successfully");
            } catch (refreshError) {
              const msg = refreshError instanceof Error ? refreshError.message : "Refresh failed";
              postLog("error", "LinkedIn token refresh failed", { refreshError: msg });
              await safeUpdatePost(supabase, post.id, {
                status: "past_due",
                publish_error: `LinkedIn connection expired. Refresh failed: ${msg}`,
                publish_attempts: MAX_PUBLISH_ATTEMPTS,
              });
              results.push({ postId: post.id, status: "failed", error: `Token refresh failed: ${msg}` });
              continue;
            }
          } else {
            postLog("warn", "LinkedIn token expired and no refresh token available");
            await safeUpdatePost(supabase, post.id, {
              status: "past_due",
              publish_error: "LinkedIn connection expired. Please reconnect in Settings.",
              publish_attempts: MAX_PUBLISH_ATTEMPTS,
            });
            results.push({ postId: post.id, status: "failed", error: "Token expired, no refresh token" });
            continue;
          }
        }

        // BP-100: Upload image to LinkedIn if the post has one. Mirrors the
        // manual-publish route — image failure is logged but does not block the
        // text publish (better to ship text-only than fail the whole post).
        let imageUrn: string | null = null;
        let imageError: string | null = null;
        if (post.image_url) {
          try {
            const imageRes = await fetch(post.image_url);
            if (!imageRes.ok) {
              throw new Error(`fetch image returned ${imageRes.status}`);
            }
            const imageBuffer = await imageRes.arrayBuffer();
            const contentType = imageRes.headers.get("content-type") || "image/jpeg";
            postLog("info", "Uploading image to LinkedIn", {
              imageBytes: imageBuffer.byteLength,
              contentType,
            });
            imageUrn = await uploadImageToLinkedIn(
              accessToken,
              profile.linkedin_member_id!,
              imageBuffer,
              contentType
            );
            postLog("info", "Image uploaded to LinkedIn", { imageUrn });
          } catch (imgError) {
            imageError = imgError instanceof Error ? imgError.message : "Image upload failed";
            postLog("warn", "Image upload failed — falling back to text-only publish", {
              imageError,
              imageUrl: post.image_url,
            });
          }
        }

        // Publish to LinkedIn
        postLog("info", "Publishing to LinkedIn", { hasImage: !!imageUrn });
        const result = await publishToLinkedIn(
          accessToken,
          profile.linkedin_member_id!,
          post.content,
          post.hashtags || [],
          post.title,
          imageUrn
        );

        // Success — update post. If the image upload failed but the text
        // publish succeeded, surface the image error so the user knows their
        // image didn't make it through (visible in the post editor).
        await safeUpdatePost(supabase, post.id, {
          status: "posted",
          posted_at: new Date().toISOString(),
          linkedin_post_id: result.postId,
          linkedin_post_url: result.postUrl,
          publish_error: imageError ? `Image upload failed: ${imageError}` : null,
          updated_at: new Date().toISOString(),
        });

        results.push({ postId: post.id, status: "published" });
        postLog("info", "Published successfully", {
          linkedinUrl: result.postUrl,
          imageAttached: !!imageUrn,
          imageError,
        });

      } catch (error) {
        // Per-post catch — ensures one post failure doesn't stop others
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        const newAttempts = (post.publish_attempts || 0) + 1;
        const isAuthError = errorMsg.includes("401") || errorMsg.includes("403");

        postLog("error", "Publish failed", {
          error: errorMsg,
          attempt: newAttempts,
          isAuthError,
          willRetry: !isAuthError && newAttempts < MAX_PUBLISH_ATTEMPTS,
        });

        await safeUpdatePost(supabase, post.id, {
          status: newAttempts >= MAX_PUBLISH_ATTEMPTS || isAuthError ? "past_due" : "scheduled",
          publish_error: errorMsg,
          publish_attempts: isAuthError ? MAX_PUBLISH_ATTEMPTS : newAttempts,
        });

        results.push({ postId: post.id, status: "failed", error: errorMsg });
      }
    }

    log("info", `Processing complete: ${results.length} post(s)`, {
      published: results.filter((r) => r.status === "published").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    });

    return new Response(
      JSON.stringify({ message: "Done", count: posts.length, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (fatalError) {
    // Top-level catch — NOTHING escapes without being logged
    const msg = fatalError instanceof Error ? fatalError.message : "Unknown fatal error";
    const stack = fatalError instanceof Error ? fatalError.stack : undefined;
    log("error", "FATAL: Unhandled error in Edge Function", { error: msg, stack });

    return new Response(
      JSON.stringify({ error: "Internal server error", details: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
