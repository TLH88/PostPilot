import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { incrementQuota } from "@/lib/quota";
import type { QuotaType } from "@/lib/constants";

const VALID_TYPES: QuotaType[] = ["posts", "brainstorms", "chat_messages", "scheduled_posts", "image_generations"];

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid quota type" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await incrementQuota(user.id, type);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to increment quota";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
