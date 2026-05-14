import type { ReactElement } from "react";
import { getResendClient } from "./client";
import { EMAIL_FROM, EMAIL_REPLY_TO, type EmailSenderKey } from "./from";

/** Resend hard caps: 100 messages per batch.send() call. */
export const RESEND_BATCH_MAX = 100;

/** Per-email payload cap. Owner-chosen at 25 MB — Gmail's standard receive limit. */
export const EMAIL_PAYLOAD_MAX_BYTES = 25 * 1024 * 1024;

/**
 * One attachment as delivered to Resend. `content` is a base64-encoded
 * string of the file bytes. `filename` is what the recipient sees.
 */
export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file bytes (no data: URL prefix). */
  content: string;
  /** Optional MIME type. Resend infers if omitted. */
  contentType?: string;
}

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
  /** Optional file attachments. Caller must size-validate before calling. */
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: { name?: string; message: string; statusCode?: number };
}

/**
 * Per-sender default reply-to. Keeps each sender's reply behavior aligned
 * with its purpose:
 *   - noreply → undefined (no reply-to header; replies fall to noreply@)
 *   - hello   → hello@     (human-touch; replies → Fastmail hello inbox)
 *   - news    → hello@     (marketing replies still reach a human)
 *   - support → support@   (admin↔user thread stays in the support inbox)
 */
function defaultReplyToFor(sender: EmailSenderKey): string | undefined {
  switch (sender) {
    case "noreply":
      return undefined;
    case "hello":
    case "news":
      return EMAIL_REPLY_TO.hello;
    case "support":
      return EMAIL_REPLY_TO.support;
  }
}

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
      : input.replyTo ?? defaultReplyToFor(input.from);

  const { data, error } = await client.emails.send(
    {
      from: EMAIL_FROM[input.from],
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      react: input.react,
      replyTo,
      tags: input.tags,
      attachments: input.attachments,
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

export interface BulkRecipient {
  /** Auth user id — only used for downstream logging, not sent to Resend. */
  userId: string;
  email: string;
  /** Optional first name for personalized greeting. */
  recipientName?: string;
}

export interface SendBulkEmailInput {
  from: EmailSenderKey;
  subject: string;
  /** Same body for every recipient. Sanitize on the server before calling. */
  bodyHtml: string;
  recipients: BulkRecipient[];
  /**
   * Per-recipient React element factory. Lets the caller control the
   * template — sendBulk doesn't assume AdminMessageEmail so it can be
   * reused for future bulk sends (broadcasts, segment campaigns).
   */
  buildEmail: (recipient: BulkRecipient) => ReactElement;
  /** Stable id for the batch, used as Resend idempotency key + tag. */
  batchId: string;
  /** Extra tags applied to every recipient. Per-recipient `batch_id` is auto. */
  tags?: Array<{ name: string; value: string }>;
  replyTo?: string | null;
  /** Shared attachments delivered with every recipient's email. */
  attachments?: EmailAttachment[];
}

export interface SendBulkResult {
  ok: boolean;
  /**
   * Per-recipient outcome. On batch success, every entry has a messageId.
   * On batch failure, every entry has error and messageId is undefined —
   * Resend batches are atomic (one bad input → entire batch rejected).
   */
  results: Array<{
    userId: string;
    email: string;
    messageId?: string;
  }>;
  error?: { name?: string; message: string; statusCode?: number };
}

/**
 * Send N individual emails in one Resend batch.send() call.
 *
 * Each recipient gets their own To: header (no BCC, no cross-exposure of
 * other recipients' addresses) and their own template render so greetings
 * can be personalized. Bounces and complaints attribute per-recipient.
 *
 * Caveats:
 * - Resend caps each batch at 100 messages. Caller must chunk.
 * - Batches are atomic: if ANY entry fails validation (bad email, etc.),
 *   the whole batch is rejected. Pre-validate before calling.
 * - No attachments or scheduling supported in batches.
 */
export async function sendBulkEmail(input: SendBulkEmailInput): Promise<SendBulkResult> {
  if (input.recipients.length === 0) {
    return { ok: true, results: [] };
  }
  if (input.recipients.length > RESEND_BATCH_MAX) {
    return {
      ok: false,
      results: input.recipients.map((r) => ({ userId: r.userId, email: r.email })),
      error: { message: `Batch too large: ${input.recipients.length} > ${RESEND_BATCH_MAX}` },
    };
  }

  const client = getResendClient();
  const replyTo =
    input.replyTo === null
      ? undefined
      : input.replyTo ?? defaultReplyToFor(input.from);

  const baseTags = [
    ...(input.tags ?? []),
    { name: "batch_id", value: input.batchId },
  ];

  const entries = input.recipients.map((r) => ({
    from: EMAIL_FROM[input.from],
    to: [r.email],
    subject: input.subject,
    react: input.buildEmail(r),
    replyTo,
    tags: baseTags,
    attachments: input.attachments,
  }));

  const { data, error } = await client.batch.send(entries, {
    idempotencyKey: `admin-bulk/${input.batchId}`,
  });

  if (error) {
    return {
      ok: false,
      results: input.recipients.map((r) => ({ userId: r.userId, email: r.email })),
      error: {
        name: error.name,
        message: error.message,
        statusCode: "statusCode" in error ? (error.statusCode as number) : undefined,
      },
    };
  }

  // Resend returns the array of { id } objects in the same order as we
  // passed entries. Zip them back to recipients.
  const ids = data?.data ?? [];
  return {
    ok: true,
    results: input.recipients.map((r, i) => ({
      userId: r.userId,
      email: r.email,
      messageId: ids[i]?.id,
    })),
  };
}
