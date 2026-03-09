"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleCard({
  title,
  description,
  children,
  defaultOpen = true,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <ChevronDown
            className={cn(
              "size-5 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </CardHeader>
      {open && <CardContent className="space-y-5">{children}</CardContent>}
    </Card>
  );
}
