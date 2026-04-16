"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, UserPlus, MessageCircle, AtSign, CheckCircle2, XCircle, Sparkles, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Notification } from "@/types";

interface NotificationWithActor extends Notification {
  actor_name?: string | null;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  assignment: UserPlus,
  mention: AtSign,
  comment: MessageCircle,
  approval_request: Bell,
  approval_decision: CheckCircle2,
  post_published: Sparkles,
  post_failed: XCircle,
  trial_ending: Bell,
  trial_ended: Bell,
  deadline: Bell,
};

const TYPE_LABELS: Record<string, string> = {
  assignment: "Assignments",
  mention: "Mentions",
  comment: "Comments",
  approval_request: "Approval Requests",
  approval_decision: "Approval Decisions",
  post_published: "Published",
  post_failed: "Failed",
  trial_ending: "Trial",
  trial_ended: "Trial",
  deadline: "Deadlines",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  if (days === 1) return `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?limit=100${filter === "unread" ? "&unreadOnly=true" : ""}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  async function markOneRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Silent fail
    }
  }

  async function deleteNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    } catch {
      toast.error("Failed to delete");
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "unread" ? `${unreadCount} unread` : `${notifications.length} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-input p-0.5 bg-muted/50">
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                filter === "unread"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
              <Check className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Bell className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {filter === "unread"
                ? "You're all caught up. Switch to All to see your full history."
                : "When teammates assign you posts, mention you, or request reviews, they'll appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <Card
                key={n.id}
                className={cn(!n.read && "border-l-4 border-l-primary bg-primary/5")}
              >
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  <div className={cn(
                    "flex size-9 items-center justify-center rounded-full shrink-0",
                    !n.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", !n.read ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
                      {n.action_url && (
                        <Link
                          href={n.action_url}
                          onClick={() => !n.read && markOneRead(n.id)}
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      )}
                      {!n.read && (
                        <button
                          onClick={() => markOneRead(n.id)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="text-[11px] font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
