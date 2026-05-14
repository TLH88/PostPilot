import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(500),
  is_default: z.boolean().optional(),
});

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_greetings")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ greetings: data ?? [] });
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

  // If marking new as default, clear other defaults first
  if (parsed.data.is_default) {
    await supabase.from("email_greetings").update({ is_default: false }).eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("email_greetings")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ greeting: data });
}
