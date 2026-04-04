import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotaStatus } from "@/lib/quota";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getQuotaStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch quota";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
