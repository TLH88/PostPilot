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
