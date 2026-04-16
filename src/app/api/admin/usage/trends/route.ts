import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/admin";
import { getUsageTrends, type TrendPeriod } from "@/lib/admin/usage-queries";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const period = (url.searchParams.get("period") ?? "month") as TrendPeriod;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  try {
    const trends = await getUsageTrends(period, from, to);
    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Admin usage trends error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
