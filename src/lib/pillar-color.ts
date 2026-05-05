/**
 * Deterministic color assignment for content pillars.
 *
 * Pillars are user-defined free text, so we hash the name to a fixed slot
 * in a curated palette. Same pillar always lands on the same color across
 * the app. The palette stays inside the existing theme aesthetic — flat
 * Tailwind hues that read well in both light and dark mode.
 */

export type PillarColor = {
  /** Tailwind text color for the uppercase tag and idle filter label */
  text: string;
  /** Border accent (idea/post card left edge, idle filter pill border) */
  border: string;
  /** SOLID fill for the active/selected state — high-contrast on purpose */
  bgSolid: string;
  /** Text color when the solid fill is applied (paired with bgSolid) */
  textOnSolid: string;
  /** Plain background for the pill in idle state */
  bgIdle: string;
  /** Solid swatch used for the small dot/key on filter pills */
  dot: string;
};

// Amber gets black text — the others all read well with white. Picked by
// luminance against the white-text WCAG threshold so users with either
// theme see proper contrast on the selected pill.
const PALETTE: PillarColor[] = [
  { text: "text-blue-500",    border: "border-blue-500/50",    bgSolid: "bg-blue-500",    textOnSolid: "text-white", bgIdle: "bg-blue-500/5",    dot: "bg-blue-500" },
  { text: "text-orange-500",  border: "border-orange-500/50",  bgSolid: "bg-orange-500",  textOnSolid: "text-white", bgIdle: "bg-orange-500/5",  dot: "bg-orange-500" },
  { text: "text-purple-500",  border: "border-purple-500/50",  bgSolid: "bg-purple-500",  textOnSolid: "text-white", bgIdle: "bg-purple-500/5",  dot: "bg-purple-500" },
  { text: "text-emerald-500", border: "border-emerald-500/50", bgSolid: "bg-emerald-500", textOnSolid: "text-white", bgIdle: "bg-emerald-500/5", dot: "bg-emerald-500" },
  { text: "text-rose-500",    border: "border-rose-500/50",    bgSolid: "bg-rose-500",    textOnSolid: "text-white", bgIdle: "bg-rose-500/5",    dot: "bg-rose-500" },
  { text: "text-cyan-500",    border: "border-cyan-500/50",    bgSolid: "bg-cyan-500",    textOnSolid: "text-white", bgIdle: "bg-cyan-500/5",    dot: "bg-cyan-500" },
  { text: "text-amber-500",   border: "border-amber-500/50",   bgSolid: "bg-amber-500",   textOnSolid: "text-black", bgIdle: "bg-amber-500/5",   dot: "bg-amber-500" },
  { text: "text-indigo-500",  border: "border-indigo-500/50",  bgSolid: "bg-indigo-500",  textOnSolid: "text-white", bgIdle: "bg-indigo-500/5",  dot: "bg-indigo-500" },
];

const NEUTRAL: PillarColor = {
  text: "text-muted-foreground",
  border: "border-muted-foreground/30",
  bgSolid: "bg-muted-foreground",
  textOnSolid: "text-background",
  bgIdle: "bg-transparent",
  dot: "bg-muted-foreground/50",
};

/** Stable string hash → palette slot. Same input always maps to same output. */
function slotFor(pillar: string): number {
  let h = 0;
  for (let i = 0; i < pillar.length; i++) {
    h = (h * 31 + pillar.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
}

export function getPillarColor(pillar: string | null | undefined): PillarColor {
  if (!pillar) return NEUTRAL;
  return PALETTE[slotFor(pillar)];
}
