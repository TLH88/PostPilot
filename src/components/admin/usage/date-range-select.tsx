"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "@/lib/admin/usage-queries";

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

interface DateRangeSelectProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  const label = RANGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {RANGE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
