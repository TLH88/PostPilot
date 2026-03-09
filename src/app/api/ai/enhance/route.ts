import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/anthropic";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  ENHANCE_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import type { CreatorProfile } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { content, instruction } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Post content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!instruction) {
      return new Response(
        JSON.stringify({ error: "Enhancement instruction is required" }),
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

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(creatorProfile),
      ENHANCE_INSTRUCTIONS,
      GUARDRAILS
    );

    // Build user message
    const userMessage = `Post to improve:\n${content}\n\nInstruction: ${instruction}`;

    // Stream response from Claude
    const anthropic = getAnthropicClient();
    const stream = anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
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
          console.error("Enhance stream error:", streamError);
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
    console.error("Enhance API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to enhance post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
