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
};

/** Ordered list for rendering in the UI dropdown */
export const ENHANCEMENT_TEMPLATE_LIST: EnhancementTemplate[] = ENHANCEMENT_TEMPLATE_KEYS.map(
  (key) => ENHANCEMENT_TEMPLATES[key]
);
