"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export type DatePreset = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

export interface DateRangeValue {
  from: Date;
  to: Date;
  preset: DatePreset;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

function presetToRange(preset: DatePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (preset) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "ytd":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    case "all":
      from.setFullYear(2000);
      break;
    case "custom":
      from.setDate(from.getDate() - 30);
      break;
  }

  return { from, to };
}

interface DateRangeSelectorProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export function useDateRange(initialPreset: DatePreset = "all"): [DateRangeValue, (v: DateRangeValue) => void] {
  return useState<DateRangeValue>(() => {
    const { from, to } = presetToRange(initialPreset);
    return { from, to, preset: initialPreset };
  });
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [pickerOpen, setPickerOpen] = useState(value.preset === "custom");

  function handlePresetChange(preset: DatePreset) {
    if (preset === "custom") {
      setPickerOpen(true);
      onChange({ ...value, preset: "custom" });
    } else {
      setPickerOpen(false);
      const { from, to } = presetToRange(preset);
      onChange({ from, to, preset });
    }
  }

  function handleCalendarClick() {
    if (pickerOpen) {
      setPickerOpen(false);
    } else {
      setPickerOpen(true);
      if (value.preset !== "custom") {
        onChange({ ...value, preset: "custom" });
      }
    }
  }

  function handleCustomFrom(dateStr: string) {
    if (!dateStr) return;
    const from = new Date(dateStr + "T00:00:00");
    onChange({ from, to: value.to, preset: "custom" });
  }

  function handleCustomTo(dateStr: string) {
    if (!dateStr) return;
    const to = new Date(dateStr + "T23:59:59");
    onChange({ from: value.from, to, preset: "custom" });
  }

  function formatDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCalendarClick}
          className={`flex items-center justify-center rounded-md border p-1.5 transition-colors cursor-pointer ${
            pickerOpen
              ? "border-primary bg-primary/10 text-primary"
              : "border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Pick custom date range"
        >
          <Calendar className="size-3.5" />
        </button>
        <select
          value={value.preset}
          onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {pickerOpen && (
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            value={formatDateInput(value.from)}
            onChange={(e) => handleCustomFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={formatDateInput(value.to)}
            onChange={(e) => handleCustomTo(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
    </div>
  );
}
