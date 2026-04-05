import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    // Verify the request comes from Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Find unused image versions for posts marked "posted" more than 10 days ago
    const { data: unusedVersions, error: queryError } = await supabase
      .from("post_image_versions")
      .select(`
        id,
        storage_path,
        post_id,
        posts!inner(status, posted_at, image_storage_path)
      `)
      .eq("posts.status", "posted")
      .lt("posts.posted_at", new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString());

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    if (!unusedVersions || unusedVersions.length === 0) {
      return NextResponse.json({ cleaned: 0 });
    }

    // Filter to only unused versions (not the currently selected image)
    const toDelete = unusedVersions.filter((v) => {
      const post = v.posts as unknown as { image_storage_path: string | null };
      return v.storage_path !== post.image_storage_path;
    });

    if (toDelete.length === 0) {
      return NextResponse.json({ cleaned: 0 });
    }

    // Delete files from storage in batches of 100
    const storagePaths = toDelete.map((v) => v.storage_path);
    for (let i = 0; i < storagePaths.length; i += 100) {
      const batch = storagePaths.slice(i, i + 100);
      await supabase.storage.from("post-images").remove(batch);
    }

    // Delete version rows
    const versionIds = toDelete.map((v) => v.id);
    const { error: deleteError } = await supabase
      .from("post_image_versions")
      .delete()
      .in("id", versionIds);

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    return NextResponse.json({ cleaned: toDelete.length });
  } catch (error) {
    logApiError("api/cron/cleanup-images", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
