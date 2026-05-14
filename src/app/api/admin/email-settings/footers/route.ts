import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sanitizeAdminEmailHtml } from "@/lib/email/sanitize";

const KINDS = ["unsubscribe", "gdpr", "governance", "custom", "noreply_notice"] as const;

const createSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  kind: z.enum(KINDS).default("custom"),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_footers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ footers: data ?? [] });
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
    .from("email_footers")
    .insert({
      ...parsed.data,
      content: sanitizeAdminEmailHtml(parsed.data.content),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ footer: data });
}
