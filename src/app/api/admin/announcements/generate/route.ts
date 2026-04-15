import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/admin";
import { getUserAIClient } from "@/lib/ai/get-user-ai-client";
import { readFile } from "fs/promises";
import { join } from "path";

const SYSTEM_PROMPT = `You are an expert product manager writing release notes for PostPilot, a LinkedIn content creation tool.

Your job is to analyze the activity log and backlog to generate a clear, professional announcement.

IMPORTANT: You MUST respond with ONLY valid JSON matching this exact structure. No markdown, no explanation, no preamble:

{
  "title": "Brief announcement title (e.g., 'Tutorial System & Calendar Improvements')",
  "description": "2-3 sentence summary of what's new in this release.",
  "features": [
    { "title": "Feature Name", "description": "Brief explanation of what it does and why it matters" }
  ],
  "bug_fixes": [
    { "title": "Fix Name", "description": "What was broken and how it was fixed" }
  ],
  "roadmap": [
    { "title": "Upcoming Feature", "description": "Brief description of what's coming next" }
  ]
}

Guidelines:
- Features: New capabilities, improvements, or enhancements that users will notice
- Bug Fixes: Things that were broken and are now fixed
- Roadmap: Items from the backlog that are planned but not yet built (status: Backlog)
- Keep descriptions concise and user-friendly (not technical)
- Focus on user benefit, not implementation details
- Only include items that are relevant to end users (skip internal/admin-only changes)`;

export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Read activity log and backlog
    const projectRoot = process.cwd();
    let activityLog = "";
    let backlog = "";

    try {
      activityLog = await readFile(
        join(projectRoot, "docs", "ACTIVITY_LOG.md"),
        "utf-8"
      );
      // Trim to recent entries (first 3000 chars to stay within token limits)
      activityLog = activityLog.slice(0, 3000);
    } catch {
      activityLog = "Activity log not available.";
    }

    try {
      backlog = await readFile(
        join(projectRoot, "docs", "BACKLOG.md"),
        "utf-8"
      );
      // Get backlog items section and completed items (last 2000 chars for roadmap)
      const backlogItems = backlog.slice(0, 2000);
      const completedSection = backlog.slice(backlog.lastIndexOf("## Completed Items"));
      backlog = backlogItems + "\n\n" + completedSection.slice(0, 1000);
    } catch {
      backlog = "Backlog not available.";
    }

    const userMessage = `Based on the following activity log and backlog, generate a release announcement.

## Recent Activity Log
${activityLog}

## Backlog & Completed Items
${backlog}

Generate the announcement JSON now.`;

    // Get AI client and generate a non-streamed response
    const { client } = await getUserAIClient();

    const response = await client.createMessage({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2000,
    });

    const content = response.text.trim();

    // Try to extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const announcement = JSON.parse(jsonStr);

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Failed to generate announcement:", error);
    return NextResponse.json(
      { error: "Failed to generate announcement draft" },
      { status: 500 }
    );
  }
}
