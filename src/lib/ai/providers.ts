import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AIProvider = "anthropic" | "openai" | "google" | "perplexity";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIRequestOptions {
  systemPrompt: string;
  messages: AIMessage[];
  maxTokens: number;
}

export interface AITextResponse {
  text: string;
}

export interface AIClient {
  createMessage(options: AIRequestOptions): Promise<AITextResponse>;
  createStream(options: AIRequestOptions): Promise<ReadableStream>;
}

// ── Provider config ───────────────────────────────────────────────────────────

interface ProviderConfig {
  defaultModel: string;
  baseURL?: string;
  availableModels: { value: string; label: string }[];
}

const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
  anthropic: {
    defaultModel: "claude-sonnet-4-6",
    availableModels: [
      { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
      { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
      { value: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    ],
  },
  openai: {
    defaultModel: "gpt-4.1",
    baseURL: "https://api.openai.com/v1",
    availableModels: [
      { value: "o3", label: "o3 (Reasoning)" },
      { value: "o4-mini", label: "o4-mini (Reasoning)" },
      { value: "o3-mini", label: "o3-mini (Reasoning)" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    ],
  },
  google: {
    defaultModel: "gemini-2.5-flash",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    availableModels: [
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
  perplexity: {
    defaultModel: "sonar-pro",
    baseURL: "https://api.perplexity.ai",
    availableModels: [
      { value: "sonar-deep-research", label: "Sonar Deep Research" },
      { value: "sonar-reasoning-pro", label: "Sonar Reasoning Pro" },
      { value: "sonar-reasoning", label: "Sonar Reasoning" },
      { value: "sonar-pro", label: "Sonar Pro" },
      { value: "sonar", label: "Sonar" },
    ],
  },
};

// ── Display names & helpers ──────────────────────────────────────────────────

export const PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  google: "Gemini",
  perplexity: "Perplexity",
};

export function getAvailableModels(provider: AIProvider) {
  return PROVIDER_CONFIG[provider].availableModels;
}

export function getDefaultModel(provider: AIProvider) {
  return PROVIDER_CONFIG[provider].defaultModel;
}

// ── Anthropic implementation ──────────────────────────────────────────────────

class AnthropicAIClient implements AIClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || PROVIDER_CONFIG.anthropic.defaultModel;
  }

  async createMessage(options: AIRequestOptions): Promise<AITextResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens,
      system: options.systemPrompt,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return { text: textBlock?.type === "text" ? textBlock.text : "" };
  }

  async createStream(options: AIRequestOptions): Promise<ReadableStream> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options.maxTokens,
      system: options.systemPrompt,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });
  }
}

// ── OpenAI-compatible implementation (OpenAI, Google, Perplexity) ─────────────

class OpenAICompatibleClient implements AIClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, provider: "openai" | "google" | "perplexity", model?: string) {
    const config = PROVIDER_CONFIG[provider];
    this.client = new OpenAI({ apiKey, baseURL: config.baseURL });
    this.model = model || config.defaultModel;
  }

  async createMessage(options: AIRequestOptions): Promise<AITextResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options.maxTokens,
      messages: [
        { role: "system" as const, content: options.systemPrompt },
        ...options.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    return { text: response.choices[0]?.message?.content ?? "" };
  }

  async createStream(options: AIRequestOptions): Promise<ReadableStream> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options.maxTokens,
      stream: true,
      messages: [
        { role: "system" as const, content: options.systemPrompt },
        ...options.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              const data = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createAIClient(
  provider: AIProvider,
  apiKey: string,
  model?: string | null
): AIClient {
  switch (provider) {
    case "anthropic":
      return new AnthropicAIClient(apiKey, model || undefined);
    case "openai":
    case "google":
    case "perplexity":
      return new OpenAICompatibleClient(apiKey, provider, model || undefined);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
