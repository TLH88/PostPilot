import crypto from "crypto";

/**
 * Tamper-resistant cookie stash used by the admin-impersonation flow.
 *
 * When an admin starts impersonating a user, we save their admin email +
 * expiry into a HMAC-signed cookie. The exit route reads it, generates a
 * fresh magic link for the admin, and restores their session.
 *
 * Security:
 *  - HMAC-SHA256 over the base64url-encoded payload prevents forgery.
 *  - Defense-in-depth: callers MUST also re-check the email is in
 *    ADMIN_EMAILS before acting on the stash.
 *  - 1h expiry encoded in the payload.
 */

export const STASH_COOKIE_NAME = "pp_admin_stash";
export const STASH_TTL_MS = 60 * 60 * 1000; // 1h

interface StashPayload {
  email: string;
  expiresAt: number;
}

function getSecret(): string {
  const secret = process.env.IMPERSONATION_STASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("IMPERSONATION_STASH_SECRET is missing or too short");
  }
  return secret;
}

export function signStash(email: string): string {
  const payload: StashPayload = {
    email,
    expiresAt: Date.now() + STASH_TTL_MS,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", getSecret())
    .update(b64)
    .digest("base64url");
  return `${b64}.${hmac}`;
}

export function verifyStash(value: string | undefined): StashPayload | null {
  if (!value) return null;
  const [b64, sig] = value.split(".");
  if (!b64 || !sig) return null;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(b64)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(b64, "base64url").toString("utf-8")
    ) as StashPayload;
    if (typeof payload.email !== "string") return null;
    if (typeof payload.expiresAt !== "number") return null;
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}
