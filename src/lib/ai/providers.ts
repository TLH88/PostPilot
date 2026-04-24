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
  /**
   * BP-128 — opt-in prefix-caching hint. When provided, tells the client
   * that the first `cacheableSystemPrefixChars` characters of `systemPrompt`
   * are stable and the remainder is volatile. Providers that support
   * explicit cache_control markers (Anthropic) will split on that boundary
   * and mark the prefix as ephemeral-cached. Providers without explicit
   * markers (OpenAI auto-caches on first ~1024 matching tokens, Google)
   * simply ignore this hint.
   *
   * Callers should set this to the length of the concatenated stable
   * sections (personality + creator context + task instructions + guardrails)
   * BEFORE any volatile content (history, timestamps, per-call context).
   */
  cacheableSystemPrefixChars?: number;
}

export interface AIUsageData {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
}

export interface AITextResponse {
  text: string;
  usage?: AIUsageData;
  generationId?: string;
  rawUsage?: unknown;
}

export interface AIStreamFinishResult {
  text: string;
  usage?: AIUsageData;
  generationId?: string;
  rawUsage?: unknown;
}

export interface AIStreamOptions extends AIRequestOptions {
  onFinish?: (result: AIStreamFinishResult) => void;
}

export interface AIClient {
  createMessage(options: AIRequestOptions): Promise<AITextResponse>;
  createStream(options: AIStreamOptions): Promise<ReadableStream>;
}

// ── Provider config ───────────────────────────────────────────────────────────

export interface ProviderConfig {
  defaultModel: string;
  baseURL?: string;
  availableModels: { value: string; label: string }[];
}

export const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
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

  /**
   * BP-128 — build the Anthropic `system` field. When the caller has marked
   * a stable prefix via `cacheableSystemPrefixChars`, split the prompt into
   * two content blocks and mark the prefix as ephemeral-cached. Subsequent
   * calls with the same prefix get a ~90% discount on those tokens.
   * When no hint is provided, pass the prompt as a plain string (legacy
   * behavior — Anthropic won't cache without an explicit marker).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildSystem(options: AIRequestOptions): any {
    const { systemPrompt, cacheableSystemPrefixChars } = options;
    if (
      !cacheableSystemPrefixChars ||
      cacheableSystemPrefixChars <= 0 ||
      cacheableSystemPrefixChars >= systemPrompt.length
    ) {
      return systemPrompt;
    }
    const stable = systemPrompt.slice(0, cacheableSystemPrefixChars);
    const volatile = systemPrompt.slice(cacheableSystemPrefixChars);
    return [
      { type: "text", text: stable, cache_control: { type: "ephemeral" } },
      { type: "text", text: volatile },
    ];
  }

  async createMessage(options: AIRequestOptions): Promise<AITextResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens,
      system: this.buildSystem(options),
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawUsage = response.usage as any;
    return {
      text: textBlock?.type === "text" ? textBlock.text : "",
      usage: {
        inputTokens: rawUsage?.input_tokens,
        outputTokens: rawUsage?.output_tokens,
        cachedTokens: rawUsage?.cache_read_input_tokens,
      },
      generationId: response.id,
      rawUsage,
    };
  }

  async createStream(options: AIStreamOptions): Promise<ReadableStream> {
    const messageStream = this.client.messages.stream({
      model: this.model,
      max_tokens: options.maxTokens,
      system: this.buildSystem(options),
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const onFinish = options.onFinish;
    const encoder = new TextEncoder();
    let streamedText = "";

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              streamedText += event.delta.text;
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

          // Extract usage from the final message for logging
          if (onFinish) {
            try {
              const finalMessage = await messageStream.finalMessage();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rawUsage = finalMessage.usage as any;
              onFinish({
                text: streamedText,
                usage: {
                  inputTokens: rawUsage?.input_tokens,
                  outputTokens: rawUsage?.output_tokens,
                  cachedTokens: rawUsage?.cache_read_input_tokens,
                },
                generationId: finalMessage.id,
                rawUsage,
              });
            } catch {
              // Usage extraction failed — still close the stream successfully
              onFinish({ text: streamedText });
            }
          }
          controller.close();
        } catch {
          if (onFinish) {
            onFinish({ text: streamedText });
          }
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

  constructor(
    apiKey: string,
    provider: "openai" | "google" | "perplexity",
    model?: string,
    baseURLOverride?: string,
    defaultHeaders?: Record<string, string>
  ) {
    const config = PROVIDER_CONFIG[provider];
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURLOverride || config.baseURL,
      defaultHeaders,
    });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawUsage = response.usage as any;
    return {
      text: response.choices[0]?.message?.content ?? "",
      usage: {
        inputTokens: rawUsage?.prompt_tokens,
        outputTokens: rawUsage?.completion_tokens,
        cachedTokens: rawUsage?.prompt_tokens_details?.cached_tokens,
        reasoningTokens: rawUsage?.completion_tokens_details?.reasoning_tokens,
      },
      generationId: response.id,
      rawUsage,
    };
  }

  async createStream(options: AIStreamOptions): Promise<ReadableStream> {
    const onFinish = options.onFinish;
    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system" as const, content: options.systemPrompt },
        ...options.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const encoder = new TextEncoder();
    let streamedText = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalUsage: any = null;
    let generationId: string | undefined;

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              streamedText += text;
              const data = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
            // The final chunk contains usage when stream_options.include_usage=true
            if (chunk.usage) {
              finalUsage = chunk.usage;
            }
            if (chunk.id && !generationId) {
              generationId = chunk.id;
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

          if (onFinish) {
            onFinish({
              text: streamedText,
              usage: finalUsage
                ? {
                    inputTokens: finalUsage.prompt_tokens,
                    outputTokens: finalUsage.completion_tokens,
                    cachedTokens: finalUsage.prompt_tokens_details?.cached_tokens,
                    reasoningTokens:
                      finalUsage.completion_tokens_details?.reasoning_tokens,
                  }
                : undefined,
              generationId,
              rawUsage: finalUsage,
            });
          }
          controller.close();
        } catch {
          if (onFinish) {
            onFinish({ text: streamedText });
          }
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

// ── Gateway helpers ──────────────────────────────────────────────────────────

export function toGatewayModelId(provider: AIProvider, modelId: string): string {
  if (modelId.includes("/")) return modelId;
  return `${provider}/${modelId}`;
}

export function createGatewayClient(
  provider: AIProvider,
  model: string
): AIClient {
  // Prefer the Vercel-issued OIDC token in deployments — it automatically
  // associates requests with this Vercel project in the AI Gateway dashboard.
  // Fall back to the team-scoped AI_GATEWAY_API_KEY for local dev.
  const gatewayAuth =
    process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
  if (!gatewayAuth) {
    throw new Error(
      "AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is not configured"
    );
  }
  const gatewayModel = toGatewayModelId(provider, model);

  // App attribution headers (featured apps + better observability)
  const refererUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const attributionHeaders: Record<string, string> = {
    "x-title": "PostPilot",
  };
  if (refererUrl) {
    attributionHeaders["http-referer"] = refererUrl;
  }

  return new OpenAICompatibleClient(
    gatewayAuth,
    "openai",
    gatewayModel,
    "https://ai-gateway.vercel.sh/v1",
    attributionHeaders
  );
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
