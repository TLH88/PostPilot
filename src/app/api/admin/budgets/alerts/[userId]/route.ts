/**
 * BP-085 Phase 3 — Admin API: list ai_budget_alerts for one user.
 *
 * GET /api/admin/budgets/alerts/[userId]
 * Returns up to 100 most-recent alert rows in descending period_end order.
 *
 * Auth: admin-only (verifyAdmin).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ai_budget_alerts")
    .select("id, alert_type, threshold_usd, actual_usd, period_start, period_end, created_at")
    .eq("user_id", userId)
    .order("period_end", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ alerts: data ?? [] });
}
