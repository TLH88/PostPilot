import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/admin";
import { getUsageTrends, type TrendPeriod } from "@/lib/admin/usage-queries";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const period = (new URL(request.url).searchParams.get("period") ?? "month") as TrendPeriod;

  try {
    const trends = await getUsageTrends(period);
    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Admin usage trends error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
