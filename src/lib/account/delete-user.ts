/**
 * BP-131: Account deletion orchestrator.
 *
 * Two entry points:
 *   - softDeleteUser: ban the auth.users row, mark user_profiles deletion
 *     state, write account_deletions audit row with status=pending_grace.
 *     Hard delete is scheduled 30 days out and run by the daily cron.
 *   - hardDeleteUser: pre-flight + storage cleanup + audit + cascade.
 *     Irreversible.
 *
 * Both are service-role operations. Callers must verify authorization
 * (admin-only for hard delete by default; self may invoke soft only).
 *
 * Audit row is inserted BEFORE the cascade fires so we never lose the
 * record of who deleted whom — even if the cascade itself fails midway.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { preflightAccountDeletion } from "./preflight";
import { cleanupUserStorage } from "./storage-cleanup";

const GRACE_DAYS = 30;

export type DeletionInitiatedByRole = "self" | "admin";

export interface SoftDeleteParams {
  admin: SupabaseClient;
  userId: string;
  initiatedBy: string; // for self: same as userId; for admin: the admin's id
  initiatedByRole: DeletionInitiatedByRole;
  reason?: string;
}

export interface HardDeleteParams extends SoftDeleteParams {
  /**
   * Set to true to bypass the soft-delete grace period. Caller is
   * responsible for surfacing the irreversibility warning to the user.
   */
  skipGrace: true;
}

interface DeleteResult {
  ok: true;
  audit_id: string;
  deletion_type: "soft" | "hard";
  scheduled_hard_delete_at?: string;
}

interface DeleteFailure {
  ok: false;
  reason: string;
  issues?: Awaited<ReturnType<typeof preflightAccountDeletion>>["issues"];
}

async function snapshotUser(
  admin: SupabaseClient,
  userId: string
): Promise<{ email: string; full_name: string | null; subscription_tier: string | null } | null> {
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (!authUser?.user?.email) return null;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("full_name, subscription_tier")
    .eq("user_id", userId)
    .single();

  return {
    email: authUser.user.email,
    full_name: profile?.full_name ?? null,
    subscription_tier: profile?.subscription_tier ?? null,
  };
}

export async function softDeleteUser(
  params: SoftDeleteParams
): Promise<DeleteResult | DeleteFailure> {
  const { admin, userId, initiatedBy, initiatedByRole, reason } = params;

  const preflight = await preflightAccountDeletion(admin, userId);
  if (!preflight.ok) {
    return { ok: false, reason: "Pre-flight checks failed", issues: preflight.issues };
  }

  const snapshot = await snapshotUser(admin, userId);
  if (!snapshot) return { ok: false, reason: "User not found" };

  const now = new Date();
  const scheduled = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);

  // 1. Audit row first — survives even if subsequent steps fail.
  const { data: auditRow, error: auditErr } = await admin
    .from("account_deletions")
    .insert({
      user_id: userId,
      user_email: snapshot.email,
      user_full_name: snapshot.full_name,
      user_subscription_tier: snapshot.subscription_tier,
      initiated_by: initiatedBy,
      initiated_by_role: initiatedByRole,
      deletion_type: "soft",
      status: "pending_grace",
      initiated_at: now.toISOString(),
      scheduled_hard_delete_at: scheduled.toISOString(),
      reason: reason ?? null,
    })
    .select("id")
    .single();

  if (auditErr || !auditRow) {
    return { ok: false, reason: `Failed to write audit row: ${auditErr?.message ?? "unknown"}` };
  }

  // 2. Mark user_profiles for cheap in-line gating.
  await admin
    .from("user_profiles")
    .update({
      deleted_at: now.toISOString(),
      deletion_scheduled_for: scheduled.toISOString(),
      account_status: "deleted",
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  // 3. Disable login by banning the auth.users row for the grace window.
  //    100 years effectively = "indefinitely" (Supabase max is high).
  await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });

  return {
    ok: true,
    audit_id: auditRow.id,
    deletion_type: "soft",
    scheduled_hard_delete_at: scheduled.toISOString(),
  };
}

export async function hardDeleteUser(
  params: HardDeleteParams
): Promise<DeleteResult | DeleteFailure> {
  const { admin, userId, initiatedBy, initiatedByRole, reason } = params;

  const preflight = await preflightAccountDeletion(admin, userId);
  if (!preflight.ok) {
    return { ok: false, reason: "Pre-flight checks failed", issues: preflight.issues };
  }

  const snapshot = await snapshotUser(admin, userId);
  if (!snapshot) return { ok: false, reason: "User not found" };

  // 1. Audit FIRST. user_id will SET NULL when the cascade fires; the
  //    snapshots persist.
  const now = new Date();
  const { data: auditRow, error: auditErr } = await admin
    .from("account_deletions")
    .insert({
      user_id: userId,
      user_email: snapshot.email,
      user_full_name: snapshot.full_name,
      user_subscription_tier: snapshot.subscription_tier,
      initiated_by: initiatedBy,
      initiated_by_role: initiatedByRole,
      deletion_type: "hard",
      status: "hard_deleted",
      initiated_at: now.toISOString(),
      hard_deleted_at: now.toISOString(),
      reason: reason ?? null,
    })
    .select("id")
    .single();

  if (auditErr || !auditRow) {
    return { ok: false, reason: `Failed to write audit row: ${auditErr?.message ?? "unknown"}` };
  }

  // 2. Storage cleanup BEFORE the cascade. If this fails we abort and
  //    the audit row records the attempt; we'd rather leave the user
  //    intact than a half-deleted state.
  try {
    await cleanupUserStorage(admin, userId);
  } catch (err) {
    return {
      ok: false,
      reason: `Storage cleanup failed; aborting hard delete to avoid partial state: ${(err as Error).message}`,
    };
  }

  // 3. Drop the auth.users row. Cascades take care of every CASCADE-
  //    linked public table; SET NULL handlers null out historical
  //    actor references.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return { ok: false, reason: `auth.admin.deleteUser failed: ${deleteErr.message}` };
  }

  return { ok: true, audit_id: auditRow.id, deletion_type: "hard" };
}

/**
 * Promote a soft-deleted account to hard-deleted. Used by the daily
 * cron Edge Function and by admins choosing to expedite a soft delete.
 * No new pre-flight checks — assumes the soft delete already passed.
 */
export async function executeScheduledHardDelete(
  admin: SupabaseClient,
  auditId: string
): Promise<DeleteResult | DeleteFailure> {
  const { data: audit } = await admin
    .from("account_deletions")
    .select("user_id, user_email, status")
    .eq("id", auditId)
    .single();

  if (!audit) return { ok: false, reason: "Audit row not found" };
  if (audit.status !== "pending_grace") {
    return { ok: false, reason: `Audit row is in status ${audit.status}, not pending_grace` };
  }
  if (!audit.user_id) {
    return { ok: false, reason: "Audit row has no user_id (already hard-deleted?)" };
  }

  try {
    await cleanupUserStorage(admin, audit.user_id);
  } catch (err) {
    return {
      ok: false,
      reason: `Storage cleanup failed; aborting hard delete: ${(err as Error).message}`,
    };
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(audit.user_id);
  if (deleteErr) {
    return { ok: false, reason: `auth.admin.deleteUser failed: ${deleteErr.message}` };
  }

  // Update audit row to reflect hard-deleted state. user_id will SET NULL
  // automatically via the FK; status flips here.
  await admin
    .from("account_deletions")
    .update({
      status: "hard_deleted",
      hard_deleted_at: new Date().toISOString(),
    })
    .eq("id", auditId);

  return { ok: true, audit_id: auditId, deletion_type: "hard" };
}

/**
 * Restore a soft-deleted account during the grace window. Lifts the
 * auth.users ban, clears user_profiles deletion markers, and updates
 * the audit row to status=restored.
 */
export async function restoreSoftDeletedUser(
  admin: SupabaseClient,
  auditId: string
): Promise<DeleteResult | DeleteFailure> {
  const { data: audit } = await admin
    .from("account_deletions")
    .select("user_id, status")
    .eq("id", auditId)
    .single();

  if (!audit) return { ok: false, reason: "Audit row not found" };
  if (audit.status !== "pending_grace") {
    return { ok: false, reason: `Cannot restore: status is ${audit.status}` };
  }
  if (!audit.user_id) return { ok: false, reason: "Audit row has no user_id" };

  await admin.auth.admin.updateUserById(audit.user_id, { ban_duration: "none" });

  await admin
    .from("user_profiles")
    .update({
      deleted_at: null,
      deletion_scheduled_for: null,
      account_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", audit.user_id);

  await admin
    .from("account_deletions")
    .update({ status: "restored", restored_at: new Date().toISOString() })
    .eq("id", auditId);

  return { ok: true, audit_id: auditId, deletion_type: "soft" };
}
