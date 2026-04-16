/**
 * Activity log helper — records workspace activity for the feed and per-post timelines.
 * BP-048: Activity Feed
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityAction =
  | "post_created"
  | "post_edited"
  | "post_commented"
  | "post_assigned"
  | "post_unassigned"
  | "post_status_changed"
  | "post_submitted_for_review"
  | "post_approved"
  | "post_changes_requested"
  | "post_scheduled"
  | "post_published"
  | "post_archived"
  | "member_joined"
  | "member_left";

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    workspace_id?: string | null;
    post_id?: string | null;
    action: ActivityAction;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from("activity_log").insert({
      user_id: params.user_id,
      workspace_id: params.workspace_id ?? null,
      post_id: params.post_id ?? null,
      action: params.action,
      details: params.details ?? {},
    });
  } catch {
    // Activity logging is best-effort — never block the main action
  }
}
