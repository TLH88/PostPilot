/**
 * BP-028 — Guided Enhancement Workflows
 *
 * Five pre-built enhancement templates for the post editor. Each template
 * produces a specific kind of improvement. The template key is sent to
 * /api/ai/enhance as the `template` field, validated via Zod.
 *
 * IMPORTANT: This file must NOT be "use client" — it is imported by both the
 * server-side API route and the client-side editor page.
 */

export const ENHANCEMENT_TEMPLATE_KEYS = [
  "add_hook",
  "story_driven",
  "add_social_proof",
  "improve_cta",
  "tighten",
  "expand",
  "rewrite",
  "add_closing",
  "make_personal",
  "add_emojis",
  "make_engaging",
] as const;

export type EnhancementTemplateKey = (typeof ENHANCEMENT_TEMPLATE_KEYS)[number];

export interface EnhancementTemplate {
  key: EnhancementTemplateKey;
  label: string;
  subtext: string;
  prompt: string;
}

export const ENHANCEMENT_TEMPLATES: Record<EnhancementTemplateKey, EnhancementTemplate> = {
  add_hook: {
    key: "add_hook",
    label: "Add Hook",
    subtext: "Strengthen the opening line to stop the scroll",
    prompt:
      "Rewrite the first 1-2 sentences of this LinkedIn post as a stronger hook that makes the reader stop scrolling. Keep the rest of the post unchanged unless the new hook makes a transition awkward, in which case lightly adjust the second sentence only.",
  },
  story_driven: {
    key: "story_driven",
    label: "Make it Story-Driven",
    subtext: "Reframe the post as a personal story",
    prompt:
      "Rewrite this LinkedIn post as a personal story that arrives at the same insight. Use 'I' statements, a concrete moment in time, and a clear takeaway. Match the user's existing voice and content pillars.",
  },
  add_social_proof: {
    key: "add_social_proof",
    label: "Add Social Proof",
    subtext: "Insert a credibility signal (stat, result, or quote)",
    prompt:
      "Add one sentence of social proof to this LinkedIn post — e.g., a specific number, a result, a customer quote, or a recognized authority. Place it where it strengthens the argument most. Do not fabricate facts; if no concrete proof can be added authentically, return the original text unchanged with a comment explaining why.",
  },
  improve_cta: {
    key: "improve_cta",
    label: "Improve CTA",
    subtext: "Sharpen the closing call-to-action",
    prompt:
      "Rewrite the closing line of this LinkedIn post to invite a specific reader response (a question, a tag, an opinion, a download). Keep it on-brand for the user's voice and content pillars.",
  },
  tighten: {
    key: "tighten",
    label: "Tighten It",
    subtext: "Cut filler words and make it ~15-20% shorter",
    prompt:
      "Tighten this LinkedIn post by removing filler words, redundant phrases, and weak qualifiers. Preserve every concrete fact and the author's voice. Return the same content approximately 15-20% shorter.",
  },
  expand: {
    key: "expand",
    label: "Expand",
    subtext: "Add depth to existing points",
    prompt:
      "Expand this LinkedIn post by deepening the existing points — add a concrete example, brief anecdote, or supporting detail to one or two of the strongest moments. Do not introduce new claims or restructure the post. Aim for ~25-40% longer while preserving the user's voice and the original arc.",
  },
  rewrite: {
    key: "rewrite",
    label: "Rewrite",
    subtext: "Fresh take, same ideas",
    prompt:
      "Rewrite this LinkedIn post from scratch using the same ideas, the same arc, and the same key facts — but with fresh phrasing, sentence structure, and pacing. The result should feel like a new draft, not a light edit. Match the user's voice and content pillars; keep the same approximate length.",
  },
  add_closing: {
    key: "add_closing",
    label: "Add Closing",
    subtext: "Wrap up — no reader ask",
    prompt:
      "Rewrite (or add, if missing) the closing of this LinkedIn post as a logical conclusion to what's been written — a final reflection, takeaway, or quiet landing that ties the threads together. Do NOT ask the reader to do anything: no questions, no calls to engage, no CTAs. That's a separate operation. Match the user's voice. Keep it to 1-2 sentences.",
  },
  make_personal: {
    key: "make_personal",
    label: "Make it Personal",
    subtext: "Strengthen 'I' voice and specific moments",
    prompt:
      "Make this LinkedIn post more personal. Strengthen the use of 'I' statements, anchor it in a specific moment or experience, and where appropriate add a touch of candid reflection. Do not invent biographical details — only sharpen what's already implied or could authentically be the user's experience based on their profile and voice samples. Preserve the user's voice and the post's structure.",
  },
  add_emojis: {
    key: "add_emojis",
    label: "Add Emojis",
    subtext: "Sparingly, on-brand",
    prompt:
      "Add emojis to this LinkedIn post in a way that feels natural and on-brand — used to mark transitions, emphasize a beat, or highlight a list item. Use them sparingly (typically 3-6 across the post, not more — never one per line). Do not change any of the actual text content. If the creator profile indicates they don't use emojis, return the original unchanged.",
  },
  make_engaging: {
    key: "make_engaging",
    label: "Make it Engaging",
    subtext: "Tighter pacing, sharper angle",
    prompt:
      "Make this LinkedIn post more engaging without significantly changing its substance or length. Tighten openings, vary sentence rhythm, surface the most interesting angle earlier, and trim anything that delays the payoff. Preserve every concrete fact and the user's voice. Goal: a draft a reader can't put down — not louder, just better-paced.",
  },
};

/** Ordered list for rendering in the UI dropdown */
export const ENHANCEMENT_TEMPLATE_LIST: EnhancementTemplate[] = ENHANCEMENT_TEMPLATE_KEYS.map(
  (key) => ENHANCEMENT_TEMPLATES[key]
);
