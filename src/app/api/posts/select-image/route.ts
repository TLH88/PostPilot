import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId, versionId } = await request.json();
    if (!postId || !versionId) {
      return NextResponse.json(
        { error: "postId and versionId are required" },
        { status: 400 }
      );
    }

    // Fetch the version row
    const { data: version, error: versionError } = await supabase
      .from("post_image_versions")
      .select("image_url, storage_path")
      .eq("id", versionId)
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Image version not found" },
        { status: 404 }
      );
    }

    // Update the post to point to this version
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        image_url: version.image_url,
        image_storage_path: version.storage_path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    return NextResponse.json({
      imageUrl: version.image_url,
      storagePath: version.storage_path,
    });
  } catch (error) {
    logApiError("api/posts/select-image", error);
    return NextResponse.json(
      { error: "Failed to select image" },
      { status: 500 }
    );
  }
}
