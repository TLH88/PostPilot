import { Resend } from "resend";

let cached: Resend | null = null;

function readApiKey(): string | undefined {
  // Owner uses environment-suffixed names on Vercel (PRODUCTION) and
  // local .env.local (LOCAL_DEV) by convention. Canonical RESEND_API_KEY
  // is also supported for portability. Priority: canonical → local-dev →
  // production, so a deployed-prod fallback never shadows a local key.
  return (
    process.env.RESEND_API_KEY ??
    process.env.RESEND_LOCAL_DEV_API_KEY ??
    process.env.RESEND_PRODUCTION_API_KEY
  );
}

export function getResendClient(): Resend {
  if (cached) return cached;
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error(
      "Resend API key is not configured — set RESEND_API_KEY in .env.local (or RESEND_PRODUCTION_API_KEY on Vercel)",
    );
  }
  cached = new Resend(apiKey);
  return cached;
}

export function isEmailConfigured(): boolean {
  return Boolean(readApiKey());
}
