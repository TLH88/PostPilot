import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sanitizeAdminEmailHtml } from "@/lib/email/sanitize";

const SENDER_KEYS = ["noreply", "hello", "news", "support"] as const;

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  subject: z.string().min(1).max(200).optional(),
  body_html: z.string().min(1).max(50_000).optional(),
  sender_key: z.enum(SENDER_KEYS).optional(),
  show_logo: z.boolean().optional(),
  greeting_id: z.string().uuid().nullable().optional(),
  signature_id: z.string().uuid().nullable().optional(),
  footer_ids: z.array(z.string().uuid()).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };
  if (typeof parsed.data.body_html === "string") {
    updates.body_html = sanitizeAdminEmailHtml(parsed.data.body_html);
  }

  const { data, error } = await supabase
    .from("email_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createAdminClient();

  // System templates are protected — cron jobs depend on their keys.
  const { data: existing } = await supabase
    .from("email_templates")
    .select("is_system, key")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (existing.is_system) {
    return NextResponse.json(
      { error: `Cannot delete system template "${existing.key}" — automated emails depend on it. You can edit it instead.` },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
