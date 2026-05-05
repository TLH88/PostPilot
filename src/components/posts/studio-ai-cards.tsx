"use client";

/**
 * Advanced Insights suggestion cards.
 *
 * Three sections — Hook, Overall, Closing — each rendered as a collapsible
 * card. Default state is collapsed to keep the chat area roomy; expanded
 * state is persisted per-draft via localStorage.
 *
 * The model can return null for any section it considers "fine as-is",
 * in which case that card is not rendered at all. If all three are null
 * we render a single compact "looks solid" line so the user knows the
 * review actually ran.
 *
 * Hook + Close suggestions are inline-replaceable text — clicking applies
 * them via `onApplyOption`. Overall suggestions are editorial advice the
 * writer applies themselves; no apply button.
 */

import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Flame,
  Anchor,
  Lightbulb,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewResponse } from "@/lib/ai/review-prompts";

type SectionKey = "hook" | "overall" | "close";

interface StudioAICardsProps {
  review: ReviewResponse;
  /**
   * Splice an option's text into the editor for hook + close sections.
   * The host decides what "replace" / "append" actually mean. Not called
   * for overall — that section is editorial advice, not inline rewrites.
   */
  onApplyOption: (
    section: "hook" | "close",
    option: { text: string; action: "replace" | "append" },
  ) => void;
  /** Used as the localStorage scope for collapsed-state persistence. */
  postId: string;
  className?: string;
}

const VERDICT_TONES: Record<string, { label: string; tone: string }> = {
  // hook
  strong:   { label: "Strong opening",   tone: "text-green-600 dark:text-green-400 border-green-500/30" },
  moderate: { label: "Could be sharper", tone: "text-amber-600 dark:text-amber-400 border-amber-500/30" },
  weak:     { label: "Weak hook",        tone: "text-red-600 dark:text-red-400 border-red-500/30" },
  // close
  present:  { label: "Closing in place", tone: "text-green-600 dark:text-green-400 border-green-500/30" },
  abrupt:   { label: "Lands abruptly",   tone: "text-amber-600 dark:text-amber-400 border-amber-500/30" },
  missing:  { label: "No closing yet",   tone: "text-red-600 dark:text-red-400 border-red-500/30" },
};

function readCollapsed(
  postId: string,
  section: SectionKey,
  fallback: boolean,
): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`adv-insights:collapsed:${postId}:${section}`);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function writeCollapsed(
  postId: string,
  section: SectionKey,
  collapsed: boolean,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `adv-insights:collapsed:${postId}:${section}`,
      collapsed ? "1" : "0",
    );
  } catch {
    /* swallow */
  }
}

function SectionCard({
  postId,
  section,
  icon,
  title,
  verdict,
  rationale,
  options,
  onApplyOption,
}: {
  postId: string;
  section: "hook" | "close";
  icon: React.ReactNode;
  title: string;
  verdict: string;
  rationale: string;
  options: Array<{ text: string; action: "replace" | "append" }>;
  onApplyOption: StudioAICardsProps["onApplyOption"];
}) {
  // Default collapsed — the verdict badge in the header is enough at a
  // glance; the user expands when they want to see the suggestion text.
  const [collapsed, setCollapsed] = useState<boolean>(true);

  // Hydrate per-draft preference on mount.
  useEffect(() => {
    setCollapsed(readCollapsed(postId, section, true));
  }, [postId, section]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(postId, section, next);
      return next;
    });
  }

  const tone = VERDICT_TONES[verdict] ?? VERDICT_TONES.moderate;
  const optionCount = options.length;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.04] ring-1 ring-inset ring-primary/5">
      {/* Header — clickable. Always visible. */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-primary/[0.06]"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {icon}
          {title}
          <span className="text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
            · {optionCount} {optionCount === 1 ? "option" : "options"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", tone.tone)}>
            {tone.label}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              !collapsed && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* Body — only when expanded */}
      {!collapsed && (
        <div className="border-t border-primary/10 px-3 pt-2 pb-3">
          <p className="text-[12px] leading-snug text-foreground/80">{rationale}</p>

          <div className="mt-2.5 space-y-1.5">
            {options.map((opt, i) => (
              <div
                key={i}
                className="group rounded-lg border border-border/60 bg-background/60 p-2 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
              >
                <p className="text-[12px] italic leading-snug text-foreground/85">
                  &ldquo;{opt.text}&rdquo;
                </p>
                <div className="mt-1.5 flex justify-end">
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 gap-1 px-2 text-[11px] text-primary hover:bg-primary/10"
                    onClick={() => onApplyOption(section, opt)}
                  >
                    {opt.action === "append" ? "Add to end" : "Try it"}
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Editorial-advice card. No inline replacements — just rationale + bullets. */
function OverallCard({
  postId,
  rationale,
  suggestions,
}: {
  postId: string;
  rationale: string;
  suggestions: string[];
}) {
  const [collapsed, setCollapsed] = useState<boolean>(true);

  useEffect(() => {
    setCollapsed(readCollapsed(postId, "overall", true));
  }, [postId]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(postId, "overall", next);
      return next;
    });
  }

  const count = suggestions.length;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.04] ring-1 ring-inset ring-primary/5">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-primary/[0.06]"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Lightbulb className="size-3" />
          Overall
          <span className="text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
            · {count} {count === 1 ? "idea" : "ideas"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Some ideas
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              !collapsed && "rotate-180",
            )}
          />
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-primary/10 px-3 pt-2 pb-3">
          <p className="text-[12px] leading-snug text-foreground/80">{rationale}</p>
          <ul className="mt-2.5 space-y-1.5">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-[12px] leading-snug text-foreground/85"
              >
                <span className="mt-0.5 text-primary" aria-hidden>
                  •
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function StudioAICards({
  review,
  onApplyOption,
  postId,
  className,
}: StudioAICardsProps) {
  const allEmpty = !review.hook && !review.overall && !review.close;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        Suggestions
      </div>

      {allEmpty && (
        <div className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/[0.04] px-3 py-2 text-[12px] text-green-700 dark:text-green-400">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Reviewed — your post looks solid as-is.
        </div>
      )}

      {review.hook && (
        <SectionCard
          postId={postId}
          section="hook"
          icon={<Flame className="size-3" />}
          title="Hook options"
          verdict={review.hook.verdict}
          rationale={review.hook.rationale}
          options={review.hook.options}
          onApplyOption={onApplyOption}
        />
      )}

      {review.overall && (
        <OverallCard
          postId={postId}
          rationale={review.overall.rationale}
          suggestions={review.overall.suggestions}
        />
      )}

      {review.close && (
        <SectionCard
          postId={postId}
          section="close"
          icon={<Anchor className="size-3" />}
          title="Closing options"
          verdict={review.close.verdict}
          rationale={review.close.rationale}
          options={review.close.options}
          onApplyOption={onApplyOption}
        />
      )}
    </div>
  );
}
