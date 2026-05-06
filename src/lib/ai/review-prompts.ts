/**
 * Studio AI — review prompt + response shape.
 *
 * Phase 2 (2026-05-05): expanded from hook + close to a full editorial
 * review with three sections — HOOK, OVERALL, CLOSE — each of which the
 * model returns ONLY when changes would meaningfully strengthen the
 * post. A draft that's already solid produces all-null sections and the
 * UI shows a compact "looks solid" hint.
 *
 * Hook + Close suggestions stay as concrete inline-replaceable text.
 * Overall is editorial advice (1-sentence rationale + 1-3 actionable
 * suggestions the writer applies themselves) — not inline rewrites.
 *
 * The response is strict JSON. The endpoint validates with Zod before
 * sending to the client.
 */

import { z } from "zod";

export const REVIEW_INSTRUCTIONS = `You are reviewing a LinkedIn post draft. Be SELECTIVE. For each of three review sections (HOOK, OVERALL, CLOSE), decide whether suggesting changes would meaningfully strengthen the post. If a section is already strong and changes wouldn't noticeably help, return null for that section. The default for every section is null — only populate when an actionable improvement exists.

Return ONLY a single JSON object — no prose before or after, no markdown code fences. The shape must be exactly:

{
  "hook":    null | { "verdict": "strong" | "moderate" | "weak",   "rationale": "<1 sentence>", "options": [{ "text": "<concrete first line>", "action": "replace" }] },
  "overall": null | { "rationale": "<ONE sentence — what's in the post, what the writer is going for, and what's holding it back>", "suggestions": [<1-3 actionable advice strings>] },
  "close":   null | { "verdict": "present" | "abrupt" | "missing", "rationale": "<1 sentence>", "options": [{ "text": "<concrete close>", "action": "replace" | "append" }] }
}

When you DO populate a section:

HOOK
- Provide 1-2 hook options. Two distinct angles, not paraphrases.
- Always action "replace".
- Concrete first lines a person can paste into LinkedIn — not advice ("try opening with a stat") but the actual line.

OVERALL
- ONE sentence rationale that names what the post is about, what the writer is going for, and what's holding it back. Anchor to the substance of THIS draft.
- 1-3 specific actionable suggestions. Each is a single instruction the writer can act on, e.g. "Cut the third paragraph — it repeats the second's point", "Add a concrete example after the takeaway", "Move the personal story before the framework so it earns the lesson", "The middle section drifts — pick one of the two threads and cut the other".
- NOT inline rewrites. The writer applies these themselves.
- Don't repeat advice that's already covered by the HOOK or CLOSE sections.

CLOSE
- Provide 1-2 close options. Two distinct angles.
- action "replace" if a closing already exists (verdict "present" or "abrupt"), "append" if missing.
- A close is a logical conclusion — a final reflection or quiet landing. No questions, no CTAs.

Universal rules
- Match the creator's voice from their profile and voice samples. Mirror their tone, sentence rhythm, and "I" statement usage.
- Do not invent biographical facts. Stay anchored to the substance already in the draft.
- No hashtags. Use emojis only if the creator profile indicates they use them.
- If ALL three sections are fine as-is, return all three as null. The UI handles that gracefully.
- Output ONLY the JSON object. No commentary, no markdown.`;

// ─── Response schema ──────────────────────────────────────────────────────────

const SectionOption = z.object({
  text: z.string().min(1),
  action: z.enum(["replace", "append"]),
});

export const ReviewResponseSchema = z.object({
  hook: z
    .object({
      verdict: z.enum(["strong", "moderate", "weak"]),
      rationale: z.string().min(1),
      options: z.array(SectionOption).min(1).max(2),
    })
    .nullable(),
  overall: z
    .object({
      rationale: z.string().min(1),
      suggestions: z.array(z.string().min(1)).min(1).max(3),
    })
    .nullable(),
  close: z
    .object({
      verdict: z.enum(["present", "abrupt", "missing"]),
      rationale: z.string().min(1),
      options: z.array(SectionOption).min(1).max(2),
    })
    .nullable(),
});

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

// ─── Request shape ────────────────────────────────────────────────────────────

export const ReviewRequestSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(20, "Draft is too short to review meaningfully"),
  title: z.string().optional(),
  contentPillar: z.string().optional(),
  allowEmDashes: z.boolean().optional(),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
