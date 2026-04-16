/**
 * Notification helper — creates in-app notifications (and queues for email when provider is added).
 * BP-049: Notifications Center
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "assignment"
  | "mention"
  | "comment"
  | "approval_request"
  | "approval_decision"
  | "deadline"
  | "post_published"
  | "post_failed"
  | "trial_ending"
  | "trial_ended";

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    workspace_id?: string | null;
    type: NotificationType;
    title: string;
    body?: string;
    action_url?: string;
    post_id?: string | null;
    triggered_by?: string | null;
    email_enabled?: boolean;
  }
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      user_id: params.user_id,
      workspace_id: params.workspace_id ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      action_url: params.action_url ?? null,
      post_id: params.post_id ?? null,
      triggered_by: params.triggered_by ?? null,
      email_enabled: params.email_enabled ?? true,
      // email_queued_at is set when an email provider is integrated
    });
  } catch {
    // Notifications are best-effort — never block the main action
  }
}

export async function createNotifications(
  supabase: SupabaseClient,
  userIds: string[],
  params: Omit<Parameters<typeof createNotification>[1], "user_id">
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await supabase.from("notifications").insert(
      userIds.map((user_id) => ({
        user_id,
        workspace_id: params.workspace_id ?? null,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        action_url: params.action_url ?? null,
        post_id: params.post_id ?? null,
        triggered_by: params.triggered_by ?? null,
        email_enabled: params.email_enabled ?? true,
      }))
    );
  } catch {
    // Best-effort
  }
}
