import { NextRequest, NextResponse } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  BRAINSTORM_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPrompt } from "@/lib/ai/context-builder";
import { BrainstormInputSchema, BrainstormResponseSchema, logApiError } from "@/lib/api-utils";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = BrainstormInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { topic, contentPillar, count } = parsed.data;

    const { client, profile } = await getUserAIClient();

    // Fetch recent posts and ideas for history context
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let historyContext = "";
    if (user) {
      const [postsResult, ideasResult] = await Promise.all([
        supabase
          .from("posts")
          .select("title, content_pillar, status")
          .eq("user_id", user.id)
          .in("status", ["posted", "scheduled", "review", "draft"])
          .order("updated_at", { ascending: false })
          .limit(15),
        supabase
          .from("ideas")
          .select("title, content_pillar, temperature")
          .eq("user_id", user.id)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const recentPosts = postsResult.data ?? [];
      const recentIdeas = ideasResult.data ?? [];

      if (recentPosts.length > 0 || recentIdeas.length > 0) {
        const parts: string[] = ["\nCONTENT HISTORY (avoid repeating these topics):"];

        if (recentPosts.length > 0) {
          parts.push("Recent posts:");
          recentPosts.forEach((p) => {
            const pillar = p.content_pillar ? ` [${p.content_pillar}]` : "";
            parts.push(`- ${p.title || "Untitled"}${pillar} (${p.status})`);
          });
        }

        if (recentIdeas.length > 0) {
          parts.push("Recent ideas already generated:");
          recentIdeas.forEach((i) => {
            const pillar = i.content_pillar ? ` [${i.content_pillar}]` : "";
            parts.push(`- ${i.title}${pillar}`);
          });
        }

        // Calculate pillar distribution
        const pillarCounts: Record<string, number> = {};
        for (const p of recentPosts) {
          if (p.content_pillar) {
            pillarCounts[p.content_pillar] = (pillarCounts[p.content_pillar] || 0) + 1;
          }
        }
        if (Object.keys(pillarCounts).length > 0) {
          parts.push("\nContent pillar distribution in recent posts:");
          for (const [pillar, count] of Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])) {
            parts.push(`- ${pillar}: ${count} posts`);
          }
          const allPillars = profile.content_pillars || [];
          const underserved = allPillars.filter((p) => !pillarCounts[p]);
          if (underserved.length > 0) {
            parts.push(`\nUnderserved pillars (prioritize these): ${underserved.join(", ")}`);
          }
        }

        historyContext = parts.join("\n");
      }
    }

    // Interpolate {count} in brainstorm instructions
    const interpolatedInstructions = BRAINSTORM_INSTRUCTIONS.replace(
      /\{count\}/g,
      String(count)
    );

    const systemPrompt = buildSystemPrompt(
      BASE_PERSONALITY,
      buildCreatorContext(profile),
      interpolatedInstructions,
      GUARDRAILS,
      historyContext || undefined
    );

    // Build user message
    let userMessage = `Generate ${count} LinkedIn post ideas for me.`;
    if (topic) {
      userMessage += ` Focus on this topic: ${topic}.`;
    }
    if (contentPillar) {
      userMessage += ` Align with my content pillar: ${contentPillar}.`;
    }

    const response = await client.createMessage({
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2000,
    });

    // Parse JSON from AI response
    const rawText = response.text.trim();

    let jsonString = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }

    const rawParsed = JSON.parse(jsonString);

    const validated = BrainstormResponseSchema.safeParse(rawParsed);
    if (!validated.success) {
      logApiError("api/ai/brainstorm:response-validation", validated.error);
      return NextResponse.json(
        { error: "AI returned an unexpected response format" },
        { status: 500 }
      );
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    logApiError("api/ai/brainstorm", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to generate ideas";
    const status = message === "Unauthorized" ? 401 : message.includes("profile") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
