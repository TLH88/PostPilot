/**
 * Tutorial completion state persistence via localStorage.
 */

const PREFIX = "postpilot:tutorial:";

export function markTutorialCompleted(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}${name}:completed`, "true");
  localStorage.setItem(`${PREFIX}${name}:completed_at`, new Date().toISOString());
}

export function isTutorialCompleted(name: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${PREFIX}${name}:completed`) === "true";
}

export function resetTutorial(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PREFIX}${name}:completed`);
  localStorage.removeItem(`${PREFIX}${name}:completed_at`);
}

export function resetAllTutorials(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}
