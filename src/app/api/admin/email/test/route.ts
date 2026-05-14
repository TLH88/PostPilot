import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { isEmailConfigured } from "@/lib/email/client";
import { TestSendEmail } from "@/emails/test-send";

const bodySchema = z.object({
  to: z.string().email(),
  from: z.enum(["noreply", "hello", "news", "support"]).default("hello"),
});

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured" },
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

  const result = await sendEmail({
    from: parsed.data.from,
    to: parsed.data.to,
    subject: "PostPilot email — delivery test",
    react: TestSendEmail({
      recipientName: parsed.data.to.split("@")[0],
      sentAt: new Date().toISOString(),
    }),
    idempotencyKey: `test-send/${admin.id}/${Date.now()}`,
    tags: [
      { name: "category", value: "test" },
      { name: "sender", value: parsed.data.from },
    ],
    replyTo: parsed.data.from === "noreply" ? null : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error?.message ?? "Send failed", details: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json({ id: result.id });
}
