import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { sanitizeAdminEmailHtml } from "@/lib/email/sanitize";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  is_default: z.boolean().optional(),
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

  if (parsed.data.is_default) {
    await supabase
      .from("email_signatures")
      .update({ is_default: false })
      .eq("is_default", true)
      .neq("id", id);
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };
  if (typeof parsed.data.content === "string") {
    updates.content = sanitizeAdminEmailHtml(parsed.data.content);
  }

  const { data, error } = await supabase
    .from("email_signatures")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signature: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase.from("email_signatures").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
