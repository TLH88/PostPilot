import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "first-run" | "filtered" | "archived";

interface EmptyStateProps {
  /** Icon rendered above the title. */
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Primary CTA — typically a <Link> or interactive component. */
  primaryAction?: ReactNode;
  /** Secondary CTA — e.g. "Clear filters" or "Learn more". */
  secondaryAction?: ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

const variantStyles: Record<EmptyStateVariant, string> = {
  "first-run": "bg-muted/30",
  filtered: "bg-muted/20",
  archived: "bg-muted/10",
};

/**
 * Consistent empty-state block used across list pages (Posts, Ideas, etc.).
 * Pass a primary CTA for first-run states; include a secondary "Clear filters"
 * action for filtered variants so users never hit a dead-end.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "first-run",
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="size-10 text-muted-foreground/60 mb-3" />
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
