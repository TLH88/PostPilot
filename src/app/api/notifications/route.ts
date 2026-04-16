/**
 * GET /api/notifications — list user's notifications
 * PATCH /api/notifications — mark single or all as read
 * DELETE /api/notifications?id=xxx — delete a notification
 * BP-049: Notifications Center
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("read", false);

    const { data: notifications, error } = await query;
    if (error) throw error;

    // Fetch actor names
    const triggerIds = Array.from(new Set((notifications ?? []).map((n) => n.triggered_by).filter(Boolean) as string[]));
    const { data: profiles } = await supabase
      .from("creator_profiles")
      .select("user_id, full_name")
      .in("user_id", triggerIds.length > 0 ? triggerIds : [""]);

    const nameMap: Record<string, string> = {};
    for (const p of profiles ?? []) nameMap[p.user_id] = p.full_name ?? "";

    // Count unread
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    return NextResponse.json({
      notifications: (notifications ?? []).map((n) => ({
        ...n,
        actor_name: n.triggered_by ? nameMap[n.triggered_by] ?? null : null,
      })),
      unread_count: unreadCount ?? 0,
    });
  } catch (error) {
    logApiError("api/notifications GET", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, markAllRead } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (markAllRead) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    } else if (id) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "id or markAllRead required" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/notifications PATCH", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/notifications DELETE", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
