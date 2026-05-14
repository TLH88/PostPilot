import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sendBulkEmail, RESEND_BATCH_MAX } from "@/lib/email/send";
import { isEmailConfigured } from "@/lib/email/client";
import { sanitizeAdminEmailHtml, htmlToPlainText } from "@/lib/email/sanitize";
import { AdminMessageEmail } from "@/emails/admin-message";

const SUBJECT_MAX = 200;
const BODY_HTML_MAX = 50_000;

const bodySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(RESEND_BATCH_MAX),
  subject: z.string().min(1).max(SUBJECT_MAX),
  bodyHtml: z.string().min(1).max(BODY_HTML_MAX),
  from: z.enum(["noreply", "hello", "news", "support"]).default("support"),
  showLogo: z.boolean().default(true),
});

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

  const supabase = createAdminClient();

  // Look up all recipients in one auth call, then resolve their profiles
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

  // Profiles for full_name → personalized greeting
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, full_name")
    .in("user_id", matched.map((u) => u.id));
  const nameByUserId = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.full_name as string | null]),
  );

  // Sanitize body once — same content goes to every recipient.
  const cleanHtml = sanitizeAdminEmailHtml(parsed.data.bodyHtml);
  if (!cleanHtml.trim()) {
    return NextResponse.json(
      { error: "Body became empty after sanitization — check formatting" },
      { status: 400 },
    );
  }
  const plainText = htmlToPlainText(cleanHtml);

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
    buildEmail: (r) =>
      AdminMessageEmail({
        recipientName: r.recipientName,
        subject: parsed.data.subject,
        bodyHtml: cleanHtml,
        showLogo: parsed.data.showLogo,
      }),
    batchId,
    tags: [
      { name: "category", value: "admin-bulk-message" },
      { name: "sender", value: parsed.data.from },
    ],
  });

  // Append one log row per recipient. Status reflects the batch outcome:
  // on batch success, all sent; on batch failure, all failed (Resend
  // batches are atomic).
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
    skipped: parsed.data.userIds.length - recipients.length, // ids that didn't resolve to a user
  });
}
