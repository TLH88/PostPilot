"use client";

import { useState } from "react";
import { CalendarIcon, Clock } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];

export function ScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
}: ScheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

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
