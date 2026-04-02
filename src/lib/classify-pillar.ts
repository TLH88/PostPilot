/**
 * Keyword-based content pillar classifier.
 *
 * Matches post title and body against the user's defined pillar names.
 * Title matches are weighted 3x since the title is the strongest signal
 * of what the post is about.
 *
 * No AI call — free, instant, and accurate for descriptive pillar names.
 */

const SKIP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "to", "for", "is",
  "it", "on", "at", "by", "as", "be", "do", "no", "so", "up",
  "if", "my", "we", "he", "&",
]);

const TITLE_WEIGHT = 3;
const BODY_WEIGHT = 1;

/**
 * Extract meaningful words from a pillar name.
 * E.g. "AI & Automation" → ["ai", "automation"]
 */
function extractKeywords(pillar: string): string[] {
  return pillar
    .toLowerCase()
    .split(/[\s&,/\-–—]+/)
    .filter((w) => w.length >= 3 && !SKIP_WORDS.has(w));
}

/**
 * Count occurrences of keywords in a text (case-insensitive).
 * Uses word boundary matching for accuracy.
 */
function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    // Use a simple indexOf scan for performance
    let idx = 0;
    while ((idx = lower.indexOf(kw, idx)) !== -1) {
      // Check word boundaries: char before and after should be non-alphanumeric
      const before = idx === 0 || !/[a-z0-9]/.test(lower[idx - 1]);
      const after =
        idx + kw.length >= lower.length ||
        !/[a-z0-9]/.test(lower[idx + kw.length]);
      if (before && after) count++;
      idx += kw.length;
    }
  }
  return count;
}

/**
 * Classify a post into the best-matching content pillar.
 *
 * @param title - The post title (weighted 3x)
 * @param content - The post body content
 * @param pillars - The user's defined content pillar names
 * @returns The best-matching pillar name, or null if no match
 */
export function classifyPillar(
  title: string,
  content: string,
  pillars: string[]
): string | null {
  if (content.length < 100 || pillars.length === 0) return null;

  let bestPillar: string | null = null;
  let bestScore = 0;

  for (const pillar of pillars) {
    const keywords = extractKeywords(pillar);
    if (keywords.length === 0) continue;

    const titleScore = countMatches(title, keywords) * TITLE_WEIGHT;
    const bodyScore = countMatches(content, keywords) * BODY_WEIGHT;
    const total = titleScore + bodyScore;

    if (total > bestScore) {
      bestScore = total;
      bestPillar = pillar;
    }
  }

  return bestPillar;
}
