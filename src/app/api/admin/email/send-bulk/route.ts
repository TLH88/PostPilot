import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sendBulkEmail, RESEND_BATCH_MAX, EMAIL_PAYLOAD_MAX_BYTES } from "@/lib/email/send";
import { isEmailConfigured } from "@/lib/email/client";
import { sanitizeAdminEmailHtml, htmlToPlainText } from "@/lib/email/sanitize";
import {
  resolveGreeting,
  resolveSignature,
  resolveFooters,
  substitutePlaceholders,
} from "@/lib/email/resolve";
import { AdminMessageEmail } from "@/emails/admin-message";

const SUBJECT_MAX = 200;
const BODY_HTML_MAX = 50_000;

const attachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1),
  contentType: z.string().max(200).optional(),
});

const bodySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(RESEND_BATCH_MAX),
  subject: z.string().min(1).max(SUBJECT_MAX),
  bodyHtml: z.string().min(1).max(BODY_HTML_MAX),
  from: z.enum(["noreply", "hello", "news", "support"]).default("support"),
  showLogo: z.boolean().default(true),
  greetingId: z.string().uuid().nullable().optional(),
  signatureId: z.string().uuid().nullable().optional(),
  footerIds: z.array(z.string().uuid()).optional(),
  attachments: z.array(attachmentSchema).max(50).optional(),
});

function approxAttachmentBytes(attachments: { content: string }[] | undefined): number {
  if (!attachments) return 0;
  return attachments.reduce((sum, a) => sum + Math.floor(a.content.length * 0.75), 0);
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Resend API key is not configured" },
      { status: 500 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const attachmentBytes = approxAttachmentBytes(parsed.data.attachments);
  if (attachmentBytes > EMAIL_PAYLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: `Attachments total ${Math.round(attachmentBytes / 1024 / 1024)}MB exceeds the 25 MB limit` },
      { status: 413 },
    );
  }

  const supabase = createAdminClient();

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authData?.users ?? [];
  const targetIds = new Set(parsed.data.userIds);
  const matched = authUsers.filter((u) => targetIds.has(u.id) && u.email);
  if (matched.length === 0) {
    return NextResponse.json(
      { error: "No matching users with email addresses" },
      { status: 404 },
    );
  }

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, full_name")
    .in("user_id", matched.map((u) => u.id));
  const nameByUserId = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.full_name as string | null]),
  );

  const cleanHtml = sanitizeAdminEmailHtml(parsed.data.bodyHtml);
  if (!cleanHtml.trim()) {
    return NextResponse.json(
      { error: "Body became empty after sanitization — check formatting" },
      { status: 400 },
    );
  }
  const plainText = htmlToPlainText(cleanHtml);

  // Resolve composition pieces once (shared across all recipients)
  const [greeting, signature, footers] = await Promise.all([
    resolveGreeting(supabase, parsed.data.greetingId ?? null),
    resolveSignature(supabase, parsed.data.signatureId ?? null),
    resolveFooters(supabase, parsed.data.footerIds ?? null),
  ]);
  const footerHtmlBlocks = footers.map((f) => f.content);

  const batchId = crypto.randomUUID();

  const recipients = matched.map((u) => {
    const fullName = nameByUserId.get(u.id) ?? null;
    return {
      userId: u.id,
      email: u.email!,
      recipientName: fullName?.split(" ")[0] ?? undefined,
      fullName,
    };
  });

  const result = await sendBulkEmail({
    from: parsed.data.from,
    subject: parsed.data.subject,
    bodyHtml: cleanHtml,
    recipients,
    buildEmail: (r) => {
      const renderedGreeting = greeting
        ? substitutePlaceholders(greeting.content, {
            firstName: r.recipientName ?? "there",
          })
        : undefined;
      return AdminMessageEmail({
        recipientName: r.recipientName,
        subject: parsed.data.subject,
        bodyHtml: cleanHtml,
        showLogo: parsed.data.showLogo,
        greeting: renderedGreeting,
        signatureHtml: signature?.content,
        footerHtmlBlocks,
      });
    },
    batchId,
    tags: [
      { name: "category", value: "admin-bulk-message" },
      { name: "sender", value: parsed.data.from },
    ],
    attachments: parsed.data.attachments,
  });

  const logRows = recipients.map((r) => {
    const messageId = result.results.find((x) => x.userId === r.userId)?.messageId ?? null;
    return {
      sent_by: admin.id,
      sent_by_email: admin.email!,
      recipient_user_id: r.userId,
      recipient_email: r.email,
      recipient_full_name: r.fullName,
      sender_key: parsed.data.from,
      subject: parsed.data.subject,
      body_html: cleanHtml,
      body_plain: plainText,
      resend_message_id: messageId,
      status: result.ok ? "sent" : "failed",
      failure_reason: result.ok ? null : result.error?.message ?? "unknown",
    };
  });

  const { error: logError } = await supabase
    .from("admin_email_log")
    .insert(logRows);
  if (logError) {
    console.error("[admin/email/send-bulk] log write failed", logError);
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error?.message ?? "Bulk send failed",
        details: result.error,
        sent: 0,
        failed: recipients.length,
      },
      { status: 502 },
    );
  }

  const sentCount = result.results.filter((r) => r.messageId).length;
  return NextResponse.json({
    batchId,
    sent: sentCount,
    failed: recipients.length - sentCount,
    skipped: parsed.data.userIds.length - recipients.length,
  });
}
