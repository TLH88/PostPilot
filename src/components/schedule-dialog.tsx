"use client";

import { useState, useMemo } from "react";
import { CalendarIcon, Clock, Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SCHEDULING_SUGGESTIONS } from "@/lib/constants";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];

/** Get the next N upcoming suggested time slots from now */
function getUpcomingSuggestions(count: number): Date[] {
  const now = new Date();
  const suggestions: Date[] = [];

  // Look ahead up to 14 days to find enough suggestions
  for (let dayOffset = 0; dayOffset < 14 && suggestions.length < count; dayOffset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + dayOffset);
    const dayOfWeek = candidate.getDay();

    for (const slot of SCHEDULING_SUGGESTIONS) {
      if (slot.day === dayOfWeek) {
        const slotDate = new Date(candidate);
        slotDate.setHours(slot.hour, 0, 0, 0);

        if (slotDate > now && suggestions.length < count) {
          suggestions.push(slotDate);
        }
      }
    }
  }

  return suggestions;
}

function formatSuggestion(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  const dayStr = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${dayStr} ${timeStr}`;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
}: ScheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  const upcomingSuggestions = useMemo(() => getUpcomingSuggestions(4), []);

  function applyDate(date: Date) {
    setSelectedDate(date);
    const h = date.getHours();
    setHour(h === 0 ? 12 : h > 12 ? h - 12 : h);
    setMinute(String(date.getMinutes()).padStart(2, "0"));
    setPeriod(h >= 12 ? "PM" : "AM");
  }

  function handleSchedule() {
    if (!selectedDate) return;

    const scheduled = new Date(selectedDate);
    let h = hour;
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    scheduled.setHours(h, parseInt(minute), 0, 0);

    if (scheduled <= new Date()) return;

    onSchedule(scheduled);
    onOpenChange(false);
    setSelectedDate(undefined);
    setHour(9);
    setMinute("00");
    setPeriod("AM");
  }

  function handleNextBestTime() {
    if (upcomingSuggestions.length > 0) {
      applyDate(upcomingSuggestions[0]);
    }
  }

  const isValid =
    selectedDate !== undefined &&
    (() => {
      const test = new Date(selectedDate);
      let h = hour;
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      test.setHours(h, parseInt(minute), 0, 0);
      return test > new Date();
    })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="size-4" />
            Schedule Post
          </DialogTitle>
          <DialogDescription>
            Choose when you want this post to go live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Smart scheduling suggestions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3" />
              Best times to post
            </div>
            <div className="flex flex-wrap gap-1.5">
              {upcomingSuggestions.map((date, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyDate(date)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground",
                    selectedDate?.getTime() === date.getTime()
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input text-foreground"
                  )}
                >
                  {formatSuggestion(date)}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={handleNextBestTime}
            >
              <Zap className="size-3" />
              Schedule for next best time
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Based on LinkedIn engagement research. Peak: Tue–Thu, 8–10 AM in your timezone.
            </p>
          </div>

          {/* Date picker */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="size-3.5" />
              Time
            </label>
            <div className="flex items-center gap-2">
              <select
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                className={cn(
                  "h-9 rounded-md border border-input bg-popover text-popover-foreground px-2 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-sm font-medium">:</span>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className={cn(
                  "h-9 rounded-md border border-input bg-popover text-popover-foreground px-2 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <div className="flex rounded-md border border-input">
                <button
                  type="button"
                  onClick={() => setPeriod("AM")}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium rounded-l-md transition-colors",
                    period === "AM"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("PM")}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium rounded-r-md transition-colors",
                    period === "PM"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSchedule}
            disabled={!isValid}
            className="gap-1.5"
          >
            <CalendarIcon className="size-3.5" />
            Schedule Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
