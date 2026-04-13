import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/admin";
import { getProviderReliability, type DateRange } from "@/lib/admin/usage-queries";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = (new URL(request.url).searchParams.get("range") ?? "30d") as DateRange;

  try {
    const providers = await getProviderReliability(range);
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Admin reliability error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
