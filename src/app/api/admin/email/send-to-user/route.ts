import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { isEmailConfigured } from "@/lib/email/client";
import { sanitizeAdminEmailHtml, htmlToPlainText } from "@/lib/email/sanitize";
import { AdminMessageEmail } from "@/emails/admin-message";

const SUBJECT_MAX = 200;
const BODY_HTML_MAX = 50_000;

const bodySchema = z.object({
  userId: z.string().uuid(),
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

  // Look up recipient
  const { data: authData, error: lookupError } =
    await supabase.auth.admin.getUserById(parsed.data.userId);
  if (lookupError || !authData?.user?.email) {
    return NextResponse.json(
      { error: "Recipient user not found" },
      { status: 404 },
    );
  }
  const recipient = authData.user;
  const recipientEmail = recipient.email!; // guarded by the !authData?.user?.email check above

  // Fetch their profile for the name
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", recipient.id)
    .maybeSingle();
  const recipientFullName = profile?.full_name ?? null;

  // Sanitize the HTML and derive a plain-text approximation for search
  const cleanHtml = sanitizeAdminEmailHtml(parsed.data.bodyHtml);
  if (!cleanHtml.trim()) {
    return NextResponse.json(
      { error: "Body became empty after sanitization — check formatting" },
      { status: 400 },
    );
  }
  const plainText = htmlToPlainText(cleanHtml);

  const recipientName = recipientFullName?.split(" ")[0] ?? undefined;

  const result = await sendEmail({
    from: parsed.data.from,
    to: recipientEmail,
    subject: parsed.data.subject,
    react: AdminMessageEmail({
      recipientName,
      subject: parsed.data.subject,
      bodyHtml: cleanHtml,
      showLogo: parsed.data.showLogo,
    }),
    idempotencyKey: `admin-message/${admin.id}/${recipient.id}/${Date.now()}`,
    tags: [
      { name: "category", value: "admin-message" },
      { name: "sender", value: parsed.data.from },
    ],
  });

  // Append to audit log regardless of send outcome — we want failed
  // attempts on record too. Status reflects what happened.
  const logRow = {
    sent_by: admin.id,
    sent_by_email: admin.email!,
    recipient_user_id: recipient.id,
    recipient_email: recipientEmail,
    recipient_full_name: recipientFullName,
    sender_key: parsed.data.from,
    subject: parsed.data.subject,
    body_html: cleanHtml,
    body_plain: plainText,
    resend_message_id: result.ok ? result.id ?? null : null,
    status: result.ok ? "sent" : "failed",
    failure_reason: result.ok ? null : result.error?.message ?? "unknown",
  };

  const { error: logError } = await supabase
    .from("admin_email_log")
    .insert(logRow);
  if (logError) {
    // Don't fail the send because the log write failed — the email
    // either went or didn't, the log is best-effort accounting.
    console.error("[admin/email/send-to-user] log write failed", logError);
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error?.message ?? "Send failed", details: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    id: result.id,
    recipient: { email: recipientEmail, name: recipientFullName },
  });
}
