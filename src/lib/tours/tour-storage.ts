/**
 * Tour completion state persistence via localStorage.
 * Abstracted so we can swap to DB-backed storage later if needed.
 */

const PREFIX = "postpilot:tour:";

export function markTourCompleted(tourName: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}${tourName}:completed`, "true");
  localStorage.setItem(`${PREFIX}${tourName}:completed_at`, new Date().toISOString());
}

export function isTourCompleted(tourName: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${PREFIX}${tourName}:completed`) === "true";
}

export function resetTour(tourName: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PREFIX}${tourName}:completed`);
  localStorage.removeItem(`${PREFIX}${tourName}:completed_at`);
}

export function resetAllTours(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}

export const TOUR_NAMES = {
  WELCOME: "welcome",
  IDEA_TO_POST: "idea-to-post",
  POST_EDITOR: "post-editor",
} as const;
