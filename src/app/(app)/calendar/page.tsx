"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Send,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachHourOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { POST_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { toast } from "sonner";
import type { Post } from "@/types";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarView = "month" | "week" | "day";

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule dialog state
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [reschedulePost, setReschedulePost] = useState<Post | null>(null);

  async function handleReschedule(date: Date) {
    if (!reschedulePost) return;
    const { error } = await supabase
      .from("posts")
      .update({
        status: "scheduled",
        scheduled_for: date.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reschedulePost.id);

    if (!error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === reschedulePost.id
            ? { ...p, status: "scheduled", scheduled_for: date.toISOString() }
            : p
        )
      );
      toast.success("Post rescheduled successfully!");
    } else {
      toast.error("Failed to reschedule post.");
    }
    setReschedulePost(null);
  }

  async function handlePostNow(post: Post) {
    router.push(`/posts/${post.id}`);
  }

  // Fetch posts with scheduled_for dates
  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .not("scheduled_for", "is", null)
        .order("scheduled_for", { ascending: true });

      if (!error && data) {
        setPosts(data as Post[]);
      }

      setLoading(false);
    }

    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map posts to dates for quick lookup
  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    posts.forEach((post) => {
      if (!post.scheduled_for) return;
      const dateKey = format(new Date(post.scheduled_for), "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(post);
      map.set(dateKey, existing);
    });
    return map;
  }, [posts]);

  // Upcoming posts (next 5 scheduled posts from today)
  const upcomingPosts = useMemo(() => {
    const now = new Date();
    return posts
      .filter((p) => p.scheduled_for && new Date(p.scheduled_for) >= now)
      .slice(0, 5);
  }, [posts]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigatePrev() {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function navigateNext() {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  function navigateToday() {
    setCurrentDate(new Date());
  }

  // ── Header label ───────────────────────────────────────────────────────────
  function getHeaderLabel() {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, "MMM d")} – ${format(weekEnd, "d, yyyy")}`;
      }
      return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }

  // ── Month view days ────────────────────────────────────────────────────────
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [currentDate]);

  // ── Week view days ─────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentDate),
      end: endOfWeek(currentDate),
    });
  }, [currentDate]);

  // ── Day view hours ─────────────────────────────────────────────────────────
  const dayHours = useMemo(() => {
    return eachHourOfInterval({
      start: startOfDay(currentDate),
      end: endOfDay(currentDate),
    });
  }, [currentDate]);

  // ── Shared post pill renderer ──────────────────────────────────────────────
  function renderPostPill(post: Post, showTime = false) {
    const statusConfig =
      POST_STATUSES[post.status as keyof typeof POST_STATUSES];
    const scheduledDate = post.scheduled_for
      ? new Date(post.scheduled_for)
      : null;

    const displayTitle = post.title || (post.content ? post.content.slice(0, 30) + "..." : "Untitled");
    const previewContent = post.content ? post.content.slice(0, 200) : "";

    return (
      <Tooltip key={post.id}>
        <TooltipTrigger render={
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/posts/${post.id}`);
            }}
            className={cn(
              "w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-80",
              statusConfig?.color ?? "bg-gray-100 text-gray-700"
            )}
          />
        }>
          {showTime && scheduledDate && (
            <span className="mr-1">{format(scheduledDate, "h:mm a")}</span>
          )}
          {displayTitle}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[260px] space-y-1.5 p-3 text-left">
          <p className="font-semibold text-xs leading-snug">{displayTitle}</p>
          {previewContent && (
            <p className="text-[11px] opacity-80 leading-snug">
              {previewContent}{post.content && post.content.length > 200 ? "..." : ""}
            </p>
          )}
          {scheduledDate && (
            <p className="text-[10px] opacity-70">
              {format(scheduledDate, "MMM d, yyyy")} at {format(scheduledDate, "h:mm a")}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            {statusConfig && (
              <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium", statusConfig.color)}>
                {statusConfig.label}
              </span>
            )}
            {(post.content_pillars ?? []).map((pillar: string) => (
              <span key={pillar} className="inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-medium">
                {pillar}
              </span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // ── Expanded post card for week/day views ──────────────────────────────────
  function renderPostCard(post: Post) {
    const statusConfig =
      POST_STATUSES[post.status as keyof typeof POST_STATUSES];
    const scheduledDate = post.scheduled_for
      ? new Date(post.scheduled_for)
      : null;

    return (
      <button
        key={post.id}
        onClick={() => router.push(`/posts/${post.id}`)}
        className={cn(
          "w-full rounded-lg border text-left transition-opacity hover:opacity-80 overflow-hidden",
          statusConfig?.color ?? "bg-gray-100 text-gray-700"
        )}
      >
        {post.image_url && (
          <div className="w-full h-16 overflow-hidden">
            <img src={post.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-2">
          <div className="flex items-center gap-2 mb-1">
            {scheduledDate && (
              <span className="text-[10px] font-medium opacity-70">
                {format(scheduledDate, "h:mm a")}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold line-clamp-2">
            {post.title ||
              (post.content
                ? post.content.slice(0, 50) + "..."
                : "Untitled Post")}
          </p>
          {(post.content_pillars ?? []).length > 0 && (
            <span className="text-[9px] opacity-70 mt-1 block">
              {(post.content_pillars ?? []).join(", ")}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
        <p className="text-muted-foreground max-w-[80%]">
          Plan your publishing schedule visually. See all scheduled posts on a monthly, weekly, or daily view. Click any date to drill into that day&apos;s posts, and use the upcoming posts panel to quickly review what&apos;s next.
        </p>
      </div>

      {/* Calendar + Upcoming posts side by side */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <Card className="flex-1 min-w-0">
          {/* Calendar navigation */}
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="size-5 text-muted-foreground" />
                <CardTitle className="text-lg">
                  {getHeaderLabel()}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                {/* View toggles */}
                <div id="tour-calendar-views" className="flex rounded-md border border-input mr-2">
                  {(["month", "week", "day"] as CalendarView[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md",
                        view === v
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={navigateToday}>
                  Today
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={navigatePrev}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={navigateNext}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ── MONTH VIEW ───────────────────────────────────────────── */}
            {view === "month" && (
              <>
                <div className="grid grid-cols-7 border-b">
                  {WEEKDAY_HEADERS.map((day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((day, index) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayPosts = postsByDate.get(dateKey) ?? [];
                    const inCurrentMonth = isSameMonth(day, currentDate);
                    const today = isToday(day);

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          "min-h-[100px] border-b border-r p-1.5 transition-colors cursor-pointer hover:bg-hover-highlight",
                          !inCurrentMonth && "bg-muted/30",
                          index % 7 === 0 && "border-l-0",
                          today && "bg-primary/5"
                        )}
                        onClick={() => {
                          if (dayPosts.length > 0) {
                            setCurrentDate(day);
                            setView("day");
                          }
                        }}
                      >
                        <div className="flex items-center justify-center">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                              today && "bg-primary text-primary-foreground",
                              !inCurrentMonth && "text-muted-foreground/50",
                              inCurrentMonth && !today && "text-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayPosts.slice(0, 3).map((post) => renderPostPill(post))}
                          {dayPosts.length > 3 && (
                            <span className="block px-1 text-[10px] text-muted-foreground">
                              +{dayPosts.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── WEEK VIEW ────────────────────────────────────────────── */}
            {view === "week" && (
              <>
                <div className="grid grid-cols-7 border-b">
                  {weekDays.map((day) => (
                    <div
                      key={format(day, "yyyy-MM-dd")}
                      className={cn(
                        "px-2 py-2 text-center",
                        isToday(day) && "bg-primary/5"
                      )}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">
                        {format(day, "EEE")}
                      </p>
                      <p
                        className={cn(
                          "text-lg font-semibold mt-0.5",
                          isToday(day)
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 min-h-[400px]">
                  {weekDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayPosts = postsByDate.get(dateKey) ?? [];
                    const today = isToday(day);

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          "border-r p-2 space-y-2 cursor-pointer hover:bg-hover-highlight",
                          today && "bg-primary/5"
                        )}
                        onClick={() => {
                          setCurrentDate(day);
                          setView("day");
                        }}
                      >
                        {dayPosts.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/50 text-center pt-4">
                            No posts
                          </p>
                        ) : (
                          dayPosts.map((post) => renderPostCard(post))
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── DAY VIEW ─────────────────────────────────────────────── */}
            {view === "day" && (
              <div className="divide-y">
                {dayHours.map((hour) => {
                  const hourNum = hour.getHours();
                  const dateKey = format(currentDate, "yyyy-MM-dd");
                  const hourPosts = (postsByDate.get(dateKey) ?? []).filter(
                    (p) => {
                      if (!p.scheduled_for) return false;
                      return new Date(p.scheduled_for).getHours() === hourNum;
                    }
                  );

                  return (
                    <div
                      key={hourNum}
                      className={cn(
                        "flex min-h-[60px]",
                        hourPosts.length > 0 && "bg-primary/5"
                      )}
                    >
                      {/* Time label */}
                      <div className="w-20 shrink-0 border-r px-3 py-2 text-right">
                        <span className="text-xs font-medium text-muted-foreground">
                          {format(hour, "h a")}
                        </span>
                      </div>

                      {/* Posts in this hour */}
                      <div className="flex-1 p-2 space-y-1.5">
                        {hourPosts.map((post) => renderPostCard(post))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming posts — right side */}
        <div id="tour-upcoming-posts" className="w-full lg:w-[390px] shrink-0 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Upcoming Posts</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : upcomingPosts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium">No upcoming posts</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Schedule a post to see it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingPosts.map((post) => {
              const statusConfig =
                POST_STATUSES[post.status as keyof typeof POST_STATUSES];
              const scheduledDate = post.scheduled_for
                ? new Date(post.scheduled_for)
                : null;

              const displayTitle =
                post.title ||
                (post.content
                  ? post.content.slice(0, 50) + "..."
                  : "Untitled Post");

              return (
                <Card
                  key={post.id}
                  className="cursor-pointer transition-colors hover:bg-hover-highlight overflow-hidden"
                  onClick={() => router.push(`/posts/${post.id}`)}
                >
                  {post.image_url && (
                    <div className="w-full h-24 overflow-hidden">
                      <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="space-y-2 p-3">
                    {statusConfig && (
                      <Badge
                        variant="secondary"
                        className={`${statusConfig.color} text-[10px]`}
                      >
                        {statusConfig.label}
                      </Badge>
                    )}
                    <p className="text-sm font-semibold leading-snug line-clamp-2">
                      {displayTitle}
                    </p>
                    {scheduledDate && (
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 leading-snug">
                        Will publish to LinkedIn on {format(scheduledDate, "MMM d")} at {format(scheduledDate, "h:mm a")}
                      </div>
                    )}
                    {(post.content_pillars ?? []).map((pillar: string) => (
                      <Badge key={pillar} variant="outline" className="text-[10px] h-4">
                        {pillar}
                      </Badge>
                    ))}
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1 text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReschedulePost(post);
                          setRescheduleDialogOpen(true);
                        }}
                      >
                        <CalendarClock className="size-3" />
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1 text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostNow(post);
                        }}
                      >
                        <Send className="size-3" />
                        Post Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Reschedule dialog */}
      <ScheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        onSchedule={handleReschedule}
        initialDate={reschedulePost?.scheduled_for ? new Date(reschedulePost.scheduled_for) : undefined}
      />
    </div>
  );
}
