import { NextRequest, NextResponse } from "next/server";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import {
  BASE_PERSONALITY,
  GUARDRAILS,
  BRAINSTORM_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { buildCreatorContext, buildSystemPromptWithCacheBoundary } from "@/lib/ai/context-builder";
import { BrainstormInputSchema, BrainstormResponseSchema, logApiError, humanizeAIError } from "@/lib/api-utils";
import { createClient } from "@/lib/supabase/server";
import { checkQuota, incrementQuota, buildQuotaExceededResponse } from "@/lib/quota";
import { logAiUsage, classifyAiError } from "@/lib/ai/usage-logger";

export async function POST(request: NextRequest) {
  let activeProvider: string | undefined;
  const startTime = Date.now();
  try {
    const body = await request.json();

    const parsed = BrainstormInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { topic, contentPillar, count, trending } = parsed.data;

    const { client, profile, source, provider, model } = await getUserAIClient();
    activeProvider = provider;

    // Quota check — BYOK users bypass the system-key cap.
    const bypass = source === "byok";
    const quota = await checkQuota(profile.user_id, "brainstorms", { bypass });
    if (!quota.allowed) {
      return buildQuotaExceededResponse(quota, "brainstorms");
    }

    // Fetch recent posts and ideas for history context
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let historyContext = "";
    if (user) {
      const [postsResult, ideasResult] = await Promise.all([
        supabase
          .from("posts")
          .select("title, content_pillars, status")
          .eq("user_id", user.id)
          .in("status", ["posted", "archived", "scheduled", "review", "draft"])
          .order("updated_at", { ascending: false })
          .limit(15),
        supabase
          .from("ideas")
          .select("title, content_pillars")
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
            const pillar = p.content_pillars?.length ? ` [${p.content_pillars.join(", ")}]` : "";
            parts.push(`- ${p.title || "Untitled"}${pillar} (${p.status})`);
          });
        }

        if (recentIdeas.length > 0) {
          parts.push("Recent ideas already generated:");
          recentIdeas.forEach((i) => {
            const pillar = i.content_pillars?.length ? ` [${i.content_pillars.join(", ")}]` : "";
            parts.push(`- ${i.title}${pillar}`);
          });
        }

        // Calculate pillar distribution
        const pillarCounts: Record<string, number> = {};
        for (const p of recentPosts) {
          for (const pillar of p.content_pillars ?? []) {
            pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
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

    // BP-128: split the prompt at the boundary between stable sections
    // (personality + creator context + task instructions + guardrails) and
    // volatile history. Anthropic providers use `cacheableSystemPrefixChars`
    // to emit explicit cache_control markers and get ~90% off the prefix
    // tokens on subsequent calls. OpenAI auto-caches on prefix match and
    // ignores the hint.
    const { prompt: systemPrompt, cacheableSystemPrefixChars } =
      buildSystemPromptWithCacheBoundary(
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
    if (trending) {
      const industryScope = profile.industries?.length
        ? profile.industries.join(", ")
        : "my industry";
      const expertiseScope = profile.expertise_areas?.length
        ? `these expertise areas: ${profile.expertise_areas.join(", ")}`
        : "my stated expertise areas";
      userMessage += ` Where appropriate, draw on your awareness of recent industry conversations, news, debates, frameworks, or developments relevant to ${industryScope} and ${expertiseScope}. Don't force a "trending" angle if the topic is more naturally evergreen, but lean into recency when it sharpens an idea.`;
    }

    const response = await client.createMessage({
      systemPrompt,
      cacheableSystemPrefixChars,
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

    // AI may return a bare array or wrap it in an object like { ideas: [...] }
    const arrayData = Array.isArray(rawParsed)
      ? rawParsed
      : Array.isArray(rawParsed?.ideas)
        ? rawParsed.ideas
        : null;

    const validated = BrainstormResponseSchema.safeParse(arrayData);
    if (!validated.success) {
      logApiError("api/ai/brainstorm:response-validation", validated.error);
      return NextResponse.json(
        { error: "AI returned an unexpected response format" },
        { status: 500 }
      );
    }

    // Increment quota after successful brainstorm (skipped for BYOK)
    await incrementQuota(profile.user_id, "brainstorms", { bypass });

    logAiUsage({
      userId: profile.user_id,
      route: "brainstorm",
      provider,
      model,
      source,
      usage: response.usage,
      generationId: response.generationId,
      success: true,
      latencyMs: Date.now() - startTime,
      metadata: { trending },
    });

    return NextResponse.json(validated.data);
  } catch (error) {
    logApiError("api/ai/brainstorm", error);

    logAiUsage({
      userId: "unknown",
      route: "brainstorm",
      provider: activeProvider ?? "unknown",
      model: "unknown",
      source: "gateway",
      success: false,
      errorCode: classifyAiError(error),
      latencyMs: Date.now() - startTime,
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "The AI returned an unreadable response. Please try again.", action: "Try again — if this keeps happening, try a different AI model in Settings." },
        { status: 500 }
      );
    }

    const humanized = humanizeAIError(error, activeProvider);
    return NextResponse.json(
      { error: humanized.message, action: humanized.action, isCreditError: humanized.isCreditError, providerName: humanized.providerName, billingUrl: humanized.billingUrl },
      { status: humanized.status }
    );
  }
}
