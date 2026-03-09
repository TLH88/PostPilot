import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/anthropic";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  CHAT_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import type { CreatorProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { messages, postContent, postTitle } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch creator profile
    const { data: profile, error: profileError } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Please complete your profile first" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const creatorProfile = profile as CreatorProfile;

    // Build system prompt with optional post context
    let additionalContext: string | undefined;
    if (postContent) {
      const title = postTitle ? ` titled '${postTitle}'` : "";
      additionalContext = `The creator is working on a post${title}. Current draft:\n---\n${postContent}\n---`;
    }

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(creatorProfile),
      CHAT_INSTRUCTIONS,
      GUARDRAILS,
      additionalContext
    );

    // Map messages to Anthropic format
    const anthropicMessages = messages.map(
      (msg: { role: "user" | "assistant"; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })
    );

    // Stream response from Claude
    const anthropic = getAnthropicClient();
    const stream = anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
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
        } catch (streamError) {
          console.error("Chat stream error:", streamError);
          const errorData = JSON.stringify({ error: "Stream interrupted" });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
