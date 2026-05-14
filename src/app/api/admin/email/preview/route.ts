import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sanitizeAdminEmailHtml } from "@/lib/email/sanitize";
import {
  resolveGreeting,
  resolveSignature,
  resolveFooters,
  substitutePlaceholders,
} from "@/lib/email/resolve";
import { AdminMessageEmail } from "@/emails/admin-message";

/**
 * Render the same template the send pipeline uses, but return the HTML
 * instead of dispatching to Resend. Lets the admin verify the final
 * appearance before sending.
 *
 * Renders as ONE recipient. For bulk sends the composer can pass a
 * specific recipient (recipientId / recipientName) so the greeting
 * placeholder substitution reflects what that user will see.
 */

const SUBJECT_MAX = 200;
const BODY_HTML_MAX = 50_000;

const bodySchema = z.object({
  subject: z.string().min(1).max(SUBJECT_MAX),
  bodyHtml: z.string().min(1).max(BODY_HTML_MAX),
  from: z.enum(["noreply", "hello", "news", "support"]).default("support"),
  showLogo: z.boolean().default(true),
  greetingId: z.string().uuid().nullable().optional(),
  signatureId: z.string().uuid().nullable().optional(),
  footerIds: z.array(z.string().uuid()).optional(),
  /** Recipient sample for greeting placeholders. Optional. */
  recipientName: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Sanitize the body — preview must reflect post-sanitization output
  const cleanHtml = sanitizeAdminEmailHtml(parsed.data.bodyHtml);

  // Resolve composition pieces in parallel
  const [greeting, signature, footers] = await Promise.all([
    resolveGreeting(supabase, parsed.data.greetingId ?? null),
    resolveSignature(supabase, parsed.data.signatureId ?? null),
    resolveFooters(supabase, parsed.data.footerIds ?? null),
  ]);

  const recipientName = parsed.data.recipientName?.trim() || "Sample";
  const firstName = recipientName.split(" ")[0];

  const renderedGreeting = greeting
    ? substitutePlaceholders(greeting.content, { firstName })
    : undefined;

  // Use the current request origin as the asset base URL so the SVG
  // logo loads from this same server (localhost in dev, the preview
  // deploy URL on Vercel). Production sends use the hardcoded default.
  const requestOrigin = new URL(req.url).origin;

  const html = await render(
    AdminMessageEmail({
      recipientName: firstName,
      subject: parsed.data.subject,
      bodyHtml: cleanHtml,
      showLogo: parsed.data.showLogo,
      greeting: renderedGreeting,
      signatureHtml: signature?.content,
      footerHtmlBlocks: footers.map((f) => f.content),
      baseUrl: requestOrigin,
    }),
  );

  return NextResponse.json({ html });
}
