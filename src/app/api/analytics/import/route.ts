import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ParsedPost {
  excerpt: string;
  impressions: number | null;
  engagements: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
}

interface MatchedPost extends ParsedPost {
  postId: string;
  postTitle: string;
  matched: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, posts } = await request.json();

    if (action === "match") {
      // Fetch all user's posted/archived posts for matching
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id, title, content")
        .eq("user_id", user.id)
        .in("status", ["posted", "archived"])
        .order("posted_at", { ascending: false });

      if (!userPosts) {
        return NextResponse.json({ matches: [] });
      }

      const matches: MatchedPost[] = (posts as ParsedPost[]).map((parsed) => {
        // Try to match by comparing excerpt against post title and content
        const excerptLower = parsed.excerpt.toLowerCase().replace(/[^a-z0-9 ]/g, "");

        let bestMatch: { id: string; title: string } | null = null;
        let bestScore = 0;

        for (const post of userPosts) {
          const titleLower = (post.title ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
          const contentStart = (post.content ?? "").slice(0, 120).toLowerCase().replace(/[^a-z0-9 ]/g, "");

          // Check if excerpt appears in title or content start
          let score = 0;
          if (titleLower && excerptLower.includes(titleLower.slice(0, 30))) score += 3;
          if (contentStart && excerptLower.includes(contentStart.slice(0, 40))) score += 3;

          // Word overlap scoring
          const excerptWords = excerptLower.split(/\s+/).filter((w) => w.length > 3);
          const postWords = `${titleLower} ${contentStart}`.split(/\s+/).filter((w) => w.length > 3);
          const overlap = excerptWords.filter((w) => postWords.includes(w)).length;
          score += overlap;

          if (score > bestScore && score >= 2) {
            bestScore = score;
            bestMatch = { id: post.id, title: post.title ?? "Untitled" };
          }
        }

        return {
          ...parsed,
          postId: bestMatch?.id ?? "",
          postTitle: bestMatch?.title ?? "",
          matched: !!bestMatch,
        };
      });

      return NextResponse.json({ matches });
    }

    if (action === "save") {
      const toSave = (posts as MatchedPost[]).filter((p) => p.matched && p.postId);
      let updated = 0;

      for (const post of toSave) {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (post.impressions != null) updateData.impressions = post.impressions;
        if (post.engagements != null) updateData.engagements = post.engagements;
        if (post.reactions != null) updateData.reactions = post.reactions;
        if (post.comments != null) updateData.comments_count = post.comments;
        if (post.reposts != null) updateData.reposts = post.reposts;

        const { error } = await supabase
          .from("posts")
          .update(updateData)
          .eq("id", post.postId)
          .eq("user_id", user.id);

        if (!error) updated++;
      }

      // Log the import
      await supabase.from("analytics_imports").insert({
        user_id: user.id,
        posts_matched: updated,
      });

      return NextResponse.json({ updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
