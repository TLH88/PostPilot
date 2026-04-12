import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/admin";
import {
  getUsageSummary,
  getCostTimeSeries,
  getTopUsers,
  getRouteCosts,
  type DateRange,
  type TopUserMetric,
} from "@/lib/admin/usage-queries";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const range = (url.searchParams.get("range") ?? "30d") as DateRange;
  const userSort = (url.searchParams.get("userSort") ?? "cost") as TopUserMetric;
  const userLimit = Math.min(parseInt(url.searchParams.get("userLimit") ?? "20", 10), 500);

  try {
    const [summary, timeSeries, topUsers, routeCosts] = await Promise.all([
      getUsageSummary(range),
      getCostTimeSeries(range),
      getTopUsers(range, userLimit, userSort),
      getRouteCosts(range),
    ]);

    return NextResponse.json({ summary, timeSeries, topUsers, routeCosts });
  } catch (error) {
    console.error("Admin usage summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
