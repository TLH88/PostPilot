/**
 * BP-085 Phase 3 follow-up — Fan-out helper to insert one `notifications`
 * row per admin user.
 *
 * Used by the budget evaluator (and any future admin-targeted alert
 * source) to notify every admin in `ADMIN_EMAILS`. We reuse the existing
 * `notifications` table + `<NotificationsBell />` UI rather than building
 * a parallel admin-notifications schema; each admin user's bell shows
 * their own copy of the alert and tracks read state independently.
 *
 * Insertion uses the service-role admin client to bypass RLS.
 */

import { createAdminClient } from "@/lib/supabase/admin";

let cachedAdminEmails: string[] | null = null;

function getAdminEmails(): string[] {
  if (cachedAdminEmails !== null) return cachedAdminEmails;
  cachedAdminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return cachedAdminEmails;
}

/**
 * Resolve `ADMIN_EMAILS` env var → list of `auth.users.id` values.
 *
 * Reads the auth user list via service role (bounded — admin set is
 * always small). Returns empty when no admins are configured.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data) return [];

  const ids: string[] = [];
  for (const u of data.users) {
    if (u.email && adminEmails.includes(u.email.toLowerCase())) {
      ids.push(u.id);
    }
  }
  return ids;
}

export interface AdminNotificationInput {
  /** type string — picked up by NotificationsBell's TYPE_ICON map for display */
  type: string;
  title: string;
  body?: string | null;
  /** Where the bell row links the admin to. */
  actionUrl?: string | null;
  /** Optional: actor user_id (e.g. the user who tripped the budget). */
  triggeredBy?: string | null;
  postId?: string | null;
}

/**
 * Insert one notification per admin user. Best-effort: surfaces the
 * insertion error to the caller so the evaluator can log it, but never
 * throws on "no admins configured" (returns 0).
 *
 * Returns the number of rows inserted.
 */
export async function notifyAdmins(input: AdminNotificationInput): Promise<number> {
  const adminIds = await getAdminUserIds();
  if (adminIds.length === 0) return 0;

  const supabase = createAdminClient();
  const rows = adminIds.map((uid) => ({
    user_id: uid,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    action_url: input.actionUrl ?? null,
    post_id: input.postId ?? null,
    triggered_by: input.triggeredBy ?? null,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) throw error;
  return rows.length;
}
