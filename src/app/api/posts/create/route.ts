/**
 * POST /api/posts/create — create a new draft post with a required title.
 * BP-133: Server-side enforcement — title must be non-null and ≥3 trimmed chars.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { logApiError } from "@/lib/api-utils";

const Body = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(200, "Title must be 200 characters or less."),
  workspaceId: z.string().uuid().optional().nullable(),
  ideaId: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    const json = await request.json();
    body = Body.parse(json);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? "Invalid input")
        : "Invalid JSON";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      title: body.title,
      content: "",
      status: "draft",
      hashtags: [],
      character_count: 0,
    };

    if (body.ideaId) {
      insertPayload.idea_id = body.ideaId;
    }

    if (body.workspaceId) {
      insertPayload.workspace_id = body.workspaceId;
      insertPayload.assigned_to = user.id;
      insertPayload.assigned_by = user.id;
      insertPayload.assigned_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("posts")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      logApiError("api/posts/create", error);
      return NextResponse.json(
        { error: "Failed to create post. Please try again." },
        { status: 500 }
      );
    }

    // Log activity (fire-and-forget — don't block the response)
    logActivity(supabase, {
      user_id: user.id,
      workspace_id: body.workspaceId ?? null,
      post_id: data.id,
      action: "post_created",
      ...(body.ideaId ? { details: { source: "idea", idea_id: body.ideaId } } : {}),
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    logApiError("api/posts/create", error);
    return NextResponse.json(
      { error: "Failed to create post. Please try again." },
      { status: 500 }
    );
  }
}
