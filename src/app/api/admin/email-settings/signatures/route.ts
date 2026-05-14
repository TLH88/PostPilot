import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sanitizeAdminEmailHtml } from "@/lib/email/sanitize";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  is_default: z.boolean().optional(),
});

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_signatures")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signatures: data ?? [] });
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

  if (parsed.data.is_default) {
    await supabase.from("email_signatures").update({ is_default: false }).eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("email_signatures")
    .insert({
      ...parsed.data,
      content: sanitizeAdminEmailHtml(parsed.data.content),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signature: data });
}
