/**
 * BP-131: Pre-flight checks that must pass before any account deletion
 * (admin-initiated or self-serve). Failures are returned as structured
 * issues so the calling route can either block (admin/self) or auto-
 * remediate (e.g. cancel a Stripe subscription).
 *
 * The functions here do NOT mutate state — pure inspection. The caller
 * decides whether to block, fix, or override.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type PreflightIssue =
  | {
      kind: "owns_multi_member_workspace";
      severity: "block";
      workspaces: { id: string; name: string; member_count: number }[];
      message: string;
    }
  | {
      kind: "active_stripe_subscription";
      severity: "auto_cancel"; // hard delete must cancel before proceeding
      stripe_subscription_id: string;
      tier: string;
      message: string;
    }
  | {
      kind: "already_soft_deleted";
      severity: "block";
      deleted_at: string;
      scheduled_hard_delete_at: string | null;
      message: string;
    };

export interface PreflightResult {
  ok: boolean;
  issues: PreflightIssue[];
}

/**
 * Inspect a user account for conditions that prevent (or require remediation
 * before) deletion. Pass an admin (service-role) client — RLS would otherwise
 * scope the workspace + subscription queries to the requesting user.
 */
export async function preflightAccountDeletion(
  admin: SupabaseClient,
  userId: string
): Promise<PreflightResult> {
  const issues: PreflightIssue[] = [];

  // 1. Already soft-deleted? Avoid double-processing.
  const { data: profile } = await admin
    .from("user_profiles")
    .select("deleted_at, deletion_scheduled_for")
    .eq("user_id", userId)
    .single();

  if (profile?.deleted_at) {
    issues.push({
      kind: "already_soft_deleted",
      severity: "block",
      deleted_at: profile.deleted_at,
      scheduled_hard_delete_at: profile.deletion_scheduled_for,
      message:
        "Account is already in a soft-deleted state. Use the restore flow or wait for the scheduled hard delete to complete.",
    });
  }

  // 2. Owns any workspace with >1 member? Block until ownership is
  //    transferred — workspaces.owner_id is ON DELETE RESTRICT (BP-131
  //    migration), so the cascade would fail anyway. Catch it cleanly here.
  const { data: ownedWorkspaces } = await admin
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", userId);

  for (const ws of ownedWorkspaces ?? []) {
    const { count } = await admin
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ws.id);
    const memberCount = count ?? 0;
    if (memberCount > 1) {
      issues.push({
        kind: "owns_multi_member_workspace",
        severity: "block",
        workspaces: [{ id: ws.id, name: ws.name, member_count: memberCount }],
        message: `Cannot delete: user owns workspace "${ws.name}" with ${memberCount} members. Transfer ownership first.`,
      });
    }
  }

  // 3. Active Stripe subscription? Forward-compat for BP-015. Subscriptions
  //    table doesn't exist yet (lands with BP-015), so this query is wrapped
  //    to no-op silently if the table is missing.
  try {
    const { data: subs } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, tier, status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"]);
    for (const sub of subs ?? []) {
      issues.push({
        kind: "active_stripe_subscription",
        severity: "auto_cancel",
        stripe_subscription_id: sub.stripe_subscription_id,
        tier: sub.tier,
        message: `Active ${sub.tier} subscription must be cancelled in Stripe before deletion.`,
      });
    }
  } catch {
    // subscriptions table doesn't exist yet — fine, BP-015 will add it.
  }

  const blocking = issues.filter((i) => i.severity === "block");
  return { ok: blocking.length === 0, issues };
}
