"use client";

import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MODAL_PAGE_SIZE = 25;

// ─── Category Mapping ─────────────────────────────────────────────────────────
// Groups individual pillars into broader categories based on keyword matching.
// Pillars that don't match any category become their own standalone category.

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: "Customer & Client",
    keywords: [
      "customer",
      "client",
      "support",
      "service",
      "success",
      "retention",
      "satisfaction",
      "experience",
      "cx",
      "cs",
    ],
  },
  {
    category: "Leadership & Management",
    keywords: [
      "leadership",
      "leader",
      "mentorship",
      "mentor",
      "management",
      "manager",
      "team building",
      "executive",
      "coaching",
      "delegation",
    ],
  },
  {
    category: "AI & Technology",
    keywords: [
      "ai",
      "artificial intelligence",
      "technology",
      "tech",
      "automation",
      "machine learning",
      "ml",
      "data",
      "software",
      "digital",
      "saas",
      "cloud",
      "devops",
      "engineering",
    ],
  },
  {
    category: "Career & Growth",
    keywords: [
      "career",
      "growth",
      "professional development",
      "skill",
      "learning",
      "upskilling",
      "job",
      "hiring",
      "recruiting",
      "resume",
      "interview",
    ],
  },
  {
    category: "Marketing & Sales",
    keywords: [
      "marketing",
      "sales",
      "branding",
      "brand",
      "social media",
      "content marketing",
      "seo",
      "advertising",
      "copywriting",
      "demand gen",
      "go-to-market",
      "gtm",
    ],
  },
  {
    category: "Culture & People",
    keywords: [
      "culture",
      "values",
      "diversity",
      "inclusion",
      "dei",
      "workplace",
      "remote work",
      "hybrid",
      "employee",
      "people",
      "hr",
      "human resources",
      "wellness",
      "well-being",
      "work-life",
    ],
  },
  {
    category: "Strategy & Business",
    keywords: [
      "strategy",
      "business",
      "startup",
      "entrepreneur",
      "founder",
      "innovation",
      "product",
      "operations",
      "finance",
      "revenue",
      "pricing",
      "competition",
      "market",
    ],
  },
  {
    category: "Personal Brand & Storytelling",
    keywords: [
      "personal brand",
      "thought leadership",
      "storytelling",
      "story",
      "authenticity",
      "vulnerability",
      "influence",
      "public speaking",
      "networking",
    ],
  },
  {
    category: "Industry & Trends",
    keywords: [
      "industry",
      "trends",
      "future",
      "prediction",
      "forecast",
      "disruption",
      "transformation",
    ],
  },
];

interface PillarCategory {
  name: string;
  pillars: { name: string; count: number }[];
  totalCount: number;
}

function categorizePillars(
  pillarCounts: Record<string, number>
): PillarCategory[] {
  const assigned = new Set<string>();
  const categories: PillarCategory[] = [];

  // Match pillars to categories
  for (const rule of CATEGORY_RULES) {
    const matched: { name: string; count: number }[] = [];
    for (const [pillar, count] of Object.entries(pillarCounts)) {
      if (assigned.has(pillar)) continue;
      const pillarLower = pillar.toLowerCase();
      if (
        rule.keywords.some(
          (kw) => pillarLower.includes(kw) || kw.includes(pillarLower)
        )
      ) {
        matched.push({ name: pillar, count });
        assigned.add(pillar);
      }
    }
    if (matched.length > 0) {
      categories.push({
        name: rule.category,
        pillars: matched.sort((a, b) => b.count - a.count),
        totalCount: matched.reduce((sum, p) => sum + p.count, 0),
      });
    }
  }

  // Any unmatched pillars become standalone categories
  for (const [pillar, count] of Object.entries(pillarCounts)) {
    if (!assigned.has(pillar)) {
      categories.push({
        name: pillar,
        pillars: [{ name: pillar, count }],
        totalCount: count,
      });
    }
  }

  // Sort by total count descending
  return categories.sort((a, b) => b.totalCount - a.totalCount);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ContentPillarBalanceProps {
  pillarCounts: Record<string, number>;
  totalPosts: number;
  title?: string;
  /**
   * When set, only the top `previewLimit` categories are shown in the card
   * and a "View all" button opens a paginated modal listing every category.
   */
  previewLimit?: number;
}

export function ContentPillarBalance({
  pillarCounts,
  totalPosts,
  title,
  previewLimit,
}: ContentPillarBalanceProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [viewAllOpen, setViewAllOpen] = useState(false);

  const categories = categorizePillars(pillarCounts);
  const hasUnderserved = categories.some((c) => c.totalCount === 0);

  const visibleCategories =
    typeof previewLimit === "number"
      ? categories.slice(0, previewLimit)
      : categories;
  const hasMore =
    typeof previewLimit === "number" && categories.length > previewLimit;

  function toggleCategory(name: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          {title ?? "Content Pillar Balance"}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="size-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                Content pillars are the key themes you post about. A balanced
                mix keeps your audience engaged and positions you as a
                well-rounded thought leader. Click any category to see the
                individual topics inside it.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Your topics are grouped into categories to show where you&apos;re
          focusing and where you can diversify.
          {hasUnderserved && (
            <span className="ml-1 text-yellow-600">
              Some categories need attention.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalPosts === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pillar tracking begins when you assign content pillars to your posts
            and ideas. Start creating content and you&apos;ll see your balance
            here.
          </p>
        ) : (
          <div className="space-y-2">
            {visibleCategories.map((category) => {
              const pct =
                totalPosts > 0
                  ? Math.round((category.totalCount / totalPosts) * 100)
                  : 0;
              const isUnderserved = category.totalCount === 0;
              const isExpanded = expandedCategories.has(category.name);
              const hasMultiplePillars = category.pillars.length > 1;

              return (
                <div key={category.name}>
                  {/* Category row */}
                  <button
                    type="button"
                    onClick={() =>
                      hasMultiplePillars && toggleCategory(category.name)
                    }
                    className={`w-full text-left space-y-1 rounded-lg px-3 py-2 transition-colors ${
                      hasMultiplePillars
                        ? "hover:bg-accent/50 cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        {hasMultiplePillars &&
                          (isExpanded ? (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          ))}
                        <span
                          className={
                            isUnderserved
                              ? "text-yellow-600 font-medium"
                              : "font-medium"
                          }
                        >
                          {category.name}
                        </span>
                        {hasMultiplePillars && (
                          <span className="text-xs text-muted-foreground">
                            ({category.pillars.length} topics)
                          </span>
                        )}
                        {isUnderserved && (
                          <span className="text-xs text-yellow-500">
                            needs content
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {category.totalCount} post
                        {category.totalCount !== 1 ? "s" : ""} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isUnderserved ? "bg-yellow-300" : "bg-primary"
                        }`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </button>

                  {/* Expanded individual pillars */}
                  {isExpanded && hasMultiplePillars && (
                    <div className="ml-8 mt-1 mb-2 space-y-1.5 border-l-2 border-muted pl-3">
                      {category.pillars.map((pillar) => {
                        const pillarPct =
                          totalPosts > 0
                            ? Math.round((pillar.count / totalPosts) * 100)
                            : 0;
                        return (
                          <div
                            key={pillar.name}
                            className="flex items-center justify-between text-xs"
                          >
                            <span
                              className={
                                pillar.count === 0
                                  ? "text-yellow-600"
                                  : "text-muted-foreground"
                              }
                            >
                              {pillar.name}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {pillar.count} post
                              {pillar.count !== 1 ? "s" : ""} ({pillarPct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {hasMore && totalPosts > 0 && (
          <button
            type="button"
            onClick={() => setViewAllOpen(true)}
            className="mt-3 w-full text-center text-xs font-medium text-primary hover:underline"
          >
            View all categories
          </button>
        )}
      </CardContent>
      {hasMore && (
        <ContentBalanceModal
          open={viewAllOpen}
          onOpenChange={setViewAllOpen}
          categories={categories}
          totalPosts={totalPosts}
          title={title ?? "Content Balance"}
        />
      )}
    </Card>
  );
}

// ─── View-all modal ───────────────────────────────────────────────────────────

interface ContentBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PillarCategory[];
  totalPosts: number;
  title: string;
}

function ContentBalanceModal({
  open,
  onOpenChange,
  categories,
  totalPosts,
  title,
}: ContentBalanceModalProps) {
  const [page, setPage] = useState(0);

  const total = categories.length;
  const totalPages = Math.max(1, Math.ceil(total / MODAL_PAGE_SIZE));
  const start = page * MODAL_PAGE_SIZE;
  const visible = categories.slice(start, start + MODAL_PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2">
          {visible.map((category) => {
            const pct =
              totalPosts > 0
                ? Math.round((category.totalCount / totalPosts) * 100)
                : 0;
            const isUnderserved = category.totalCount === 0;
            return (
              <div key={category.name} className="space-y-1 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={
                      isUnderserved
                        ? "text-yellow-600 font-medium"
                        : "font-medium"
                    }
                  >
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {category.totalCount} post
                    {category.totalCount !== 1 ? "s" : ""} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isUnderserved ? "bg-yellow-300" : "bg-primary"
                    }`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                {category.pillars.length > 1 && (
                  <div className="ml-3 mt-1 space-y-1 border-l-2 border-muted pl-3">
                    {category.pillars.map((pillar) => {
                      const pillarPct =
                        totalPosts > 0
                          ? Math.round((pillar.count / totalPosts) * 100)
                          : 0;
                      return (
                        <div
                          key={pillar.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <span
                            className={
                              pillar.count === 0
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                            }
                          >
                            {pillar.name}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {pillar.count} post
                            {pillar.count !== 1 ? "s" : ""} ({pillarPct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            {total === 0
              ? "0 categories"
              : `${start + 1}–${Math.min(start + MODAL_PAGE_SIZE, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <span className="tabular-nums">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
