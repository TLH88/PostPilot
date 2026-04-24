import type { UserProfile } from "@/types";

export function buildCreatorContext(profile: UserProfile): string {
  const sections: string[] = [];

  sections.push("CREATOR PROFILE:");

  if (profile.full_name) {
    sections.push(`Name: ${profile.full_name}`);
  }

  if (profile.headline) {
    sections.push(`Professional Headline: ${profile.headline}`);
  }

  if (profile.expertise_areas.length > 0) {
    sections.push(`Areas of Expertise: ${profile.expertise_areas.join(", ")}`);
  }

  if (profile.industries.length > 0) {
    sections.push(`Industries: ${profile.industries.join(", ")}`);
  }

  if (profile.target_audience) {
    sections.push(`Target Audience: ${profile.target_audience}`);
  }

  if (profile.content_pillars.length > 0) {
    sections.push(
      `Content Pillars (recurring themes): ${profile.content_pillars.join(", ")}`
    );
  }

  if (profile.writing_tone) {
    sections.push(`Preferred Tone: ${profile.writing_tone}`);
  }

  if (profile.voice_samples.length > 0) {
    sections.push("\nWRITING VOICE SAMPLES (write in this style):");
    profile.voice_samples.slice(0, 3).forEach((sample, i) => {
      const truncated = sample.substring(0, 500);
      sections.push(`Sample ${i + 1}: "${truncated}"`);
    });
  }

  if (profile.resume_text) {
    const truncated = profile.resume_text.substring(0, 2000);
    sections.push(`\nPROFESSIONAL BACKGROUND (from resume):\n${truncated}`);
  }

  if (profile.linkedin_about) {
    sections.push(`\nLINKEDIN ABOUT SECTION:\n${profile.linkedin_about}`);
  }

  const prefs: string[] = [];
  prefs.push(`Preferred post length: ${profile.preferred_post_length}`);
  prefs.push(`Use emojis: ${profile.use_emojis ? "Yes, sparingly" : "No"}`);
  prefs.push(`Use hashtags: ${profile.use_hashtags ? "Yes" : "No"}`);
  sections.push(`\nFORMATTING PREFERENCES:\n${prefs.join("\n")}`);

  return sections.join("\n");
}

export function buildSystemPrompt(
  basePersonality: string,
  creatorContext: string,
  taskInstructions: string,
  guardrails: string,
  additionalContext?: string
): string {
  const parts = [basePersonality, creatorContext, taskInstructions, guardrails];

  if (additionalContext) {
    parts.push(additionalContext);
  }

  return parts.join("\n\n---\n\n");
}

/**
 * BP-128 — same as `buildSystemPrompt` but also returns the character length
 * of the stable prefix (everything before `additionalContext`). Use this
 * when the caller wants to pass `cacheableSystemPrefixChars` to the AI
 * client so Anthropic can emit explicit `cache_control` markers.
 *
 * The stable prefix is: basePersonality + creatorContext + taskInstructions
 * + guardrails, joined by the same separator as `buildSystemPrompt`.
 * `additionalContext` is the volatile tail (history, per-call context).
 */
export function buildSystemPromptWithCacheBoundary(
  basePersonality: string,
  creatorContext: string,
  taskInstructions: string,
  guardrails: string,
  additionalContext?: string
): { prompt: string; cacheableSystemPrefixChars: number } {
  const stableParts = [basePersonality, creatorContext, taskInstructions, guardrails];
  const stable = stableParts.join("\n\n---\n\n");

  if (!additionalContext) {
    return { prompt: stable, cacheableSystemPrefixChars: stable.length };
  }

  const separator = "\n\n---\n\n";
  const prompt = stable + separator + additionalContext;
  // Include the separator in the stable prefix so the volatile suffix starts
  // cleanly at the additionalContext boundary.
  return { prompt, cacheableSystemPrefixChars: stable.length + separator.length };
}
