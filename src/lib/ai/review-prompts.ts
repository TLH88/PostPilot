/**
 * Studio AI — Phase 1 review prompt + response shape.
 *
 * The review endpoint asks the model to evaluate the HOOK (first line/two)
 * and the CLOSE (final line/paragraph) of a draft and propose 1–2 concrete
 * alternatives the user can insert with one click. Body anchors and voice
 * alignment land in later phases.
 *
 * The response is strict JSON. The endpoint validates with Zod before
 * sending to the client.
 */

import { z } from "zod";

export const REVIEW_INSTRUCTIONS = `You are reviewing a LinkedIn post draft to suggest concrete improvements to the HOOK (opening line / first two lines) and the CLOSE (final line or paragraph). Return ONLY a single JSON object — no prose before or after, no markdown code fences. The shape must be exactly:

{
  "hook": {
    "verdict": "strong" | "moderate" | "weak",
    "rationale": "<1-2 sentences explaining what's working or what's holding it back. Concrete and specific to THIS draft.>",
    "options": [
      { "text": "<a proposed new opening, 1-2 sentences>", "action": "replace" }
    ]
  },
  "close": {
    "verdict": "present" | "abrupt" | "missing",
    "rationale": "<1-2 sentences>",
    "options": [
      { "text": "<a proposed close, 1-2 sentences>", "action": "replace" | "append" }
    ]
  }
}

Hard rules:
- Always provide exactly 2 hook options and 2 close options. Two distinct angles, not paraphrases of each other.
- Hook options ALWAYS use action "replace" — they replace the existing first line(s).
- Close options use action "replace" if a closing already exists (verdict is "present" or "abrupt"), or action "append" if no closing exists (verdict is "missing").
- A close is a logical conclusion to the post — a final reflection or quiet landing. It must NOT ask the reader to do anything (no questions, no CTAs). That's a separate operation.
- Match the creator's voice from their profile and voice samples. Mirror their tone, sentence rhythm, and use of "I" statements.
- Hook options must be concrete first lines a person can paste into LinkedIn — not advice ("try opening with a stat") but the actual line.
- Do not invent biographical facts. Stay anchored to the substance already in the draft.
- Do not include hashtags. Use emojis only if the creator profile indicates they use them.
- Even when verdict is "strong" or "present", still produce 2 options — distinct alternatives the user can compare against.
- Output ONLY the JSON object. No commentary, no markdown.`;

// ─── Response schema ──────────────────────────────────────────────────────────

const SectionOption = z.object({
  text: z.string().min(1),
  action: z.enum(["replace", "append"]),
});

export const ReviewResponseSchema = z.object({
  hook: z.object({
    verdict: z.enum(["strong", "moderate", "weak"]),
    rationale: z.string().min(1),
    options: z.array(SectionOption).min(1).max(3),
  }),
  close: z.object({
    verdict: z.enum(["present", "abrupt", "missing"]),
    rationale: z.string().min(1),
    options: z.array(SectionOption).min(1).max(3),
  }),
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
