import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/admin";
import { getUserUsageDetail, type DateRange } from "@/lib/admin/usage-queries";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const range = (url.searchParams.get("range") ?? "30d") as DateRange;
  const page = parseInt(url.searchParams.get("page") ?? "0", 10);

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const detail = await getUserUsageDetail(userId, range, page);
    return NextResponse.json(detail);
  } catch (error) {
    console.error("Admin user usage error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
