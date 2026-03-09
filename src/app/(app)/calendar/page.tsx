"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  FileText,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { POST_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Build calendar grid days (including edge days from prev/next months)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart); // Sunday
    const calEnd = endOfWeek(monthEnd); // Saturday

    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

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
      .filter(
        (p) => p.scheduled_for && new Date(p.scheduled_for) >= now
      )
      .slice(0, 5);
  }, [posts]);

  function navigatePrev() {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }

  function navigateNext() {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }

  function navigateToday() {
    setCurrentMonth(new Date());
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
        <p className="text-muted-foreground">
          See your scheduled posts at a glance. Click any date to view its posts, and use the arrows to navigate between months.
        </p>
      </div>

      {/* Calendar */}
      <Card>
        {/* Calendar navigation */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="size-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1">
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
          {/* Weekday headers */}
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

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDate.get(dateKey) ?? [];
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1.5 transition-colors",
                    !inCurrentMonth && "bg-muted/30",
                    index % 7 === 0 && "border-l-0",
                    today && "bg-primary/5"
                  )}
                >
                  {/* Day number */}
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

                  {/* Post pills */}
                  <div className="mt-1 space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => {
                      const statusConfig =
                        POST_STATUSES[
                          post.status as keyof typeof POST_STATUSES
                        ];

                      return (
                        <button
                          key={post.id}
                          onClick={() => router.push(`/posts/${post.id}`)}
                          className={cn(
                            "w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-80",
                            statusConfig?.color ??
                              "bg-gray-100 text-gray-700"
                          )}
                          title={post.title ?? "Untitled"}
                        >
                          {post.title ||
                            (post.content
                              ? post.content.slice(0, 30) + "..."
                              : "Untitled")}
                        </button>
                      );
                    })}
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
        </CardContent>
      </Card>

      {/* Upcoming posts */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <CardTitle>Upcoming Posts</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : upcomingPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium">No upcoming posts</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Schedule a post to see it here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingPosts.map((post) => {
                const statusConfig =
                  POST_STATUSES[post.status as keyof typeof POST_STATUSES];
                const scheduledDate = post.scheduled_for
                  ? new Date(post.scheduled_for)
                  : null;

                return (
                  <button
                    key={post.id}
                    onClick={() => router.push(`/posts/${post.id}`)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    {/* Date block */}
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted px-2 py-1.5">
                      {scheduledDate && (
                        <>
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            {format(scheduledDate, "MMM")}
                          </span>
                          <span className="text-lg font-bold leading-none">
                            {format(scheduledDate, "d")}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Post info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {post.title ||
                          (post.content
                            ? post.content.slice(0, 60) + "..."
                            : "Untitled Post")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {scheduledDate
                          ? format(scheduledDate, "EEEE 'at' h:mm a")
                          : "Not scheduled"}
                      </p>
                    </div>

                    {/* Status badge */}
                    {statusConfig && (
                      <Badge
                        variant="secondary"
                        className={cn("shrink-0", statusConfig.color)}
                      >
                        {statusConfig.label}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
