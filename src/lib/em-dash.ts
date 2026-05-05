/**
 * Em-dash preference — server-safe helpers only.
 *
 * The React hook + localStorage reader live in `use-em-dash.ts` so this
 * file can be imported by API routes without dragging React into the
 * server bundle.
 */

export const EM_DASH_STORAGE_KEY = "pp:allow-em-dash";

/**
 * Server-side helper — returns the em-dash suppression rule when the flag
 * is false, or empty string otherwise. Append this to the per-request
 * system-prompt context.
 */
export function buildEmDashRule(allowEmDashes: boolean | undefined): string {
  if (allowEmDashes === false) {
    return "\n\nFORMATTING RULE: Do not use em-dashes (—) anywhere in your output. Use periods, commas, colons, parentheses, or rephrase the sentence to avoid them. This applies to every line you produce.";
  }
  return "";
}
