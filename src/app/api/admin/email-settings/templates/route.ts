import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sanitizeAdminEmailHtml } from "@/lib/email/sanitize";

const SENDER_KEYS = ["noreply", "hello", "news", "support"] as const;

const createSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/i, "key must be alphanumeric / _ / -"),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  subject: z.string().min(1).max(200),
  body_html: z.string().min(1).max(50_000),
  sender_key: z.enum(SENDER_KEYS).default("support"),
  show_logo: z.boolean().default(true),
  greeting_id: z.string().uuid().nullable().optional(),
  signature_id: z.string().uuid().nullable().optional(),
  footer_ids: z.array(z.string().uuid()).default([]),
});

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      ...parsed.data,
      body_html: sanitizeAdminEmailHtml(parsed.data.body_html),
      is_system: false, // admin-created templates are never is_system
    })
    .select()
    .single();

  if (error) {
    // Likely unique key violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `A template with key "${parsed.data.key}" already exists` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ template: data });
}
