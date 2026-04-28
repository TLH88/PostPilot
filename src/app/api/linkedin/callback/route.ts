import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getLinkedInMemberId } from "@/lib/linkedin-api";
import { encrypt } from "@/lib/encryption";
import { logApiError } from "@/lib/api-utils";

// BP-145: same allowlist as src/app/api/linkedin/connect/route.ts. We re-validate
// here in case the cookie was tampered with — the cookie is httpOnly + signed
// by the browser to our domain, but defense-in-depth on a redirect target is cheap.
const RETURN_TO_ALLOWLIST = ["/posts/recovery", "/posts", "/calendar", "/dashboard", "/settings"];

function isSafeReturnTo(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  return RETURN_TO_ALLOWLIST.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}?`) || value.startsWith(`${prefix}/`)
  );
}

type RecoveryContext = { return_to: string; recover_post_id?: string };

function readRecoveryContext(request: NextRequest): RecoveryContext | null {
  const raw = request.cookies.get("linkedin_recovery_context")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RecoveryContext>;
    if (!parsed?.return_to || typeof parsed.return_to !== "string") return null;
    if (!isSafeReturnTo(parsed.return_to)) return null;
    return {
      return_to: parsed.return_to,
      recover_post_id:
        typeof parsed.recover_post_id === "string" && parsed.recover_post_id
          ? parsed.recover_post_id
          : undefined,
    };
  } catch {
    return null;
  }
}

function buildRecoveryRedirect(
  origin: string,
  ctx: RecoveryContext,
  status: "connected" | "error"
): URL {
  const url = new URL(ctx.return_to, origin);
  // Always signal that an OAuth round-trip just completed so the destination
  // page knows to force-validate and surface explicit success/failure.
  url.searchParams.set("reconnected", status === "connected" ? "1" : "error");
  if (ctx.recover_post_id) {
    url.searchParams.set("post", ctx.recover_post_id);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/settings", request.nextUrl.origin);
  const recoveryCtx = readRecoveryContext(request);

  // Helper: clear the OAuth + recovery cookies on whatever response we return.
  function clearOauthCookies(res: NextResponse): NextResponse {
    res.cookies.set("linkedin_oauth_state", "", { maxAge: 0, path: "/" });
    res.cookies.set("linkedin_recovery_context", "", { maxAge: 0, path: "/" });
    return res;
  }

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get("linkedin_oauth_state")?.value;

    if (!code || !state || !storedState || state !== storedState) {
      const target = recoveryCtx
        ? buildRecoveryRedirect(request.nextUrl.origin, recoveryCtx, "error")
        : (() => {
            const u = new URL("/settings", request.nextUrl.origin);
            u.searchParams.set("linkedin", "error");
            return u;
          })();
      return clearOauthCookies(NextResponse.redirect(target));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return clearOauthCookies(
        NextResponse.redirect(new URL("/login", request.nextUrl.origin))
      );
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

    if (recoveryCtx) {
      const target = buildRecoveryRedirect(origin, recoveryCtx, "connected");
      return clearOauthCookies(NextResponse.redirect(target));
    }

    settingsUrl.searchParams.set("linkedin", "connected");
    return clearOauthCookies(NextResponse.redirect(settingsUrl));
  } catch (error) {
    logApiError("api/linkedin/callback", error);
    if (recoveryCtx) {
      const target = buildRecoveryRedirect(
        request.nextUrl.origin,
        recoveryCtx,
        "error"
      );
      return clearOauthCookies(NextResponse.redirect(target));
    }
    settingsUrl.searchParams.set("linkedin", "error");
    return clearOauthCookies(NextResponse.redirect(settingsUrl));
  }
}
