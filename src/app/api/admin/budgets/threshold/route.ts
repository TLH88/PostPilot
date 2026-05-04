/**
 * BP-085 Phase 3 — Admin API: set or clear a user's monthly USD limit
 * (and/or team-burn alert threshold). Upserts the ai_budget_thresholds row.
 *
 * Body:
 *   { userId: string,
 *     monthlyUsdLimit?: number | null,           // null = unlimited
 *     teamBurnAlertThresholdUsd?: number }       // optional override of $30 default
 *
 * Auth: admin-only (verifyAdmin).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    userId?: string;
    monthlyUsdLimit?: number | null;
    teamBurnAlertThresholdUsd?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = body.userId;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Validate numeric inputs.
  const limit = body.monthlyUsdLimit;
  if (limit !== undefined && limit !== null) {
    if (typeof limit !== "number" || Number.isNaN(limit) || limit < 0) {
      return NextResponse.json(
        { error: "monthlyUsdLimit must be a non-negative number or null" },
        { status: 400 }
      );
    }
  }
  const burnAlert = body.teamBurnAlertThresholdUsd;
  if (burnAlert !== undefined) {
    if (typeof burnAlert !== "number" || Number.isNaN(burnAlert) || burnAlert < 0) {
      return NextResponse.json(
        { error: "teamBurnAlertThresholdUsd must be a non-negative number" },
        { status: 400 }
      );
    }
  }

  const supabase = createAdminClient();

  // Build the upsert payload — only include fields the caller specified.
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (limit !== undefined) payload.monthly_usd_limit = limit;
  if (burnAlert !== undefined) payload.team_burn_alert_threshold_usd = burnAlert;

  const { error } = await supabase
    .from("ai_budget_thresholds")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
