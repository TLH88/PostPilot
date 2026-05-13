import type { ReactElement } from "react";
import { getResendClient } from "./client";
import { EMAIL_FROM, EMAIL_REPLY_TO, type EmailSenderKey } from "./from";

export interface SendEmailInput {
  from: EmailSenderKey;
  to: string | string[];
  subject: string;
  react: ReactElement;
  /**
   * Stable idempotency key — same key + same payload within 24h returns the
   * original response without resending. Use `<event-type>/<entity-id>` form
   * (e.g. `welcome/user-123`, `weekly-usage/2026-05-13/user-123`). Different
   * payload with same key returns 409.
   */
  idempotencyKey?: string;
  /**
   * Tags surface in the Resend dashboard for filtering / analytics. Values
   * must be ASCII; keep names short.
   */
  tags?: Array<{ name: string; value: string }>;
  /**
   * Override the default reply-to (HELLO inbox). Pass `null` to explicitly
   * suppress reply-to entirely (transactional noreply scenarios).
   */
  replyTo?: string | null;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: { name?: string; message: string; statusCode?: number };
}

const DEFAULT_REPLY_TO = EMAIL_REPLY_TO.hello;

/**
 * Send a transactional or marketing email through Resend.
 *
 * Wraps `resend.emails.send` with:
 * - Sender-key indirection (callers pick from `EMAIL_FROM`, not raw strings)
 * - Default reply-to → hello@ inbox so replies always reach a human
 * - Idempotency-key + tags pass-through
 * - Structured error result (no throwing) so callers can log + degrade
 *
 * For Supabase Auth emails, use Supabase's custom SMTP config — not this
 * function. This wrapper is for app-originated email.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient();

  const replyTo =
    input.replyTo === null
      ? undefined
      : input.replyTo ?? DEFAULT_REPLY_TO;

  const { data, error } = await client.emails.send(
    {
      from: EMAIL_FROM[input.from],
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      react: input.react,
      replyTo,
      tags: input.tags,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );

  if (error) {
    return {
      ok: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: "statusCode" in error ? (error.statusCode as number) : undefined,
      },
    };
  }

  return { ok: true, id: data?.id };
}
