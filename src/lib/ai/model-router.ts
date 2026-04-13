/**
 * Smart Model Selection — automatically routes AI tasks to the most
 * cost-effective model tier based on task complexity.
 *
 * Task types:
 * - "simple": hashtags, hook analysis (cheap models are fine)
 * - "standard": enhance, brainstorm (mid-tier models)
 * - "complex": chat, draft (user's selected model)
 */

import type { AIProvider } from "./providers";

export type AITaskType = "simple" | "standard" | "complex";

/** Map of AI route purposes to task complexity */
export const ROUTE_TASK_MAP: Record<string, AITaskType> = {
  hashtags: "simple",
  "analyze-hook": "simple",
  enhance: "standard",
  brainstorm: "standard",
  chat: "complex",
  draft: "complex",
  "generate-image": "complex",
};

/** Cost tier labels for display */
export const COST_TIERS: Record<string, { label: string; indicator: string }> = {
  // Anthropic
  "claude-opus-4-6": { label: "Premium", indicator: "$$$" },
  "claude-sonnet-4-6": { label: "Standard", indicator: "$$" },
  "claude-haiku-4-5-20251001": { label: "Budget", indicator: "$" },
  "claude-opus-4-5-20251101": { label: "Premium", indicator: "$$$" },
  "claude-sonnet-4-5-20250929": { label: "Standard", indicator: "$$" },
  "claude-opus-4-1-20250805": { label: "Premium", indicator: "$$$" },
  "claude-sonnet-4-20250514": { label: "Standard", indicator: "$$" },
  "claude-opus-4-20250514": { label: "Premium", indicator: "$$$" },
  // OpenAI
  "o3": { label: "Premium", indicator: "$$$" },
  "o4-mini": { label: "Standard", indicator: "$$" },
  "o3-mini": { label: "Standard", indicator: "$$" },
  "gpt-4.1": { label: "Standard", indicator: "$$" },
  "gpt-4.1-mini": { label: "Budget", indicator: "$" },
  "gpt-4.1-nano": { label: "Budget", indicator: "$" },
  "gpt-4o": { label: "Standard", indicator: "$$" },
  "gpt-4o-mini": { label: "Budget", indicator: "$" },
  // Google
  "gemini-2.5-pro": { label: "Premium", indicator: "$$$" },
  "gemini-2.5-flash": { label: "Standard", indicator: "$$" },
  "gemini-2.5-flash-lite": { label: "Budget", indicator: "$" },
  "gemini-2.0-flash": { label: "Budget", indicator: "$" },
  // Perplexity
  "sonar-deep-research": { label: "Premium", indicator: "$$$" },
  "sonar-reasoning-pro": { label: "Premium", indicator: "$$$" },
  "sonar-reasoning": { label: "Standard", indicator: "$$" },
  "sonar-pro": { label: "Standard", indicator: "$$" },
  "sonar": { label: "Budget", indicator: "$" },
};

/** Cheapest adequate model per provider for simple tasks */
const CHEAP_MODELS: Record<AIProvider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4.1-mini",
  google: "gemini-2.5-flash-lite",
  perplexity: "sonar",
};

/** Mid-tier model per provider for standard tasks */
const STANDARD_MODELS: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4.1",
  google: "gemini-2.5-flash",
  perplexity: "sonar-pro",
};

/**
 * Given a task type and user's selected model, returns the most cost-effective
 * model to use. Returns the user's selected model for complex tasks.
 *
 * @param taskType - The type of AI task being performed
 * @param provider - The user's active AI provider
 * @param userModel - The user's selected model (used for complex tasks)
 * @param smartSelectionEnabled - Whether smart model selection is active
 */
export function getModelForTask(
  taskType: AITaskType,
  provider: AIProvider,
  userModel: string | null,
  smartSelectionEnabled: boolean
): string {
  // If smart selection is disabled, always use the user's selected model
  if (!smartSelectionEnabled) {
    return userModel || STANDARD_MODELS[provider];
  }

  switch (taskType) {
    case "simple":
      return CHEAP_MODELS[provider];
    case "standard":
      return STANDARD_MODELS[provider];
    case "complex":
      return userModel || STANDARD_MODELS[provider];
    default:
      return userModel || STANDARD_MODELS[provider];
  }
}

/**
 * Get the cost tier indicator for a model (for display in settings).
 */
export function getCostIndicator(modelId: string): string {
  return COST_TIERS[modelId]?.indicator || "$$";
}
