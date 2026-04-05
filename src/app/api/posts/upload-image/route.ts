import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const postId = formData.get("postId") as string | null;

    if (!file || !postId) {
      return NextResponse.json(
        { error: "file and postId are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, GIF, WebP` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be under 10 MB" },
        { status: 400 }
      );
    }

    // Verify post belongs to user
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Build unique storage path per upload
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${user.id}/${postId}/upload-${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;

    // Insert version row
    await supabase
      .from("post_image_versions")
      .insert({
        post_id: postId,
        user_id: user.id,
        storage_path: storagePath,
        image_url: imageUrl,
        prompt: null,
        source: "upload",
      });

    // Update post record (uploaded images are immediately selected)
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        image_url: imageUrl,
        image_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (updateError) {
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    return NextResponse.json({
      imageUrl,
      storagePath,
    });
  } catch (error) {
    logApiError("api/posts/upload-image", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

// DELETE — remove selected image from post (versions remain for re-selection; cron cleans up later)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    // Clear image fields on post (don't delete storage — versions remain available)
    await supabase
      .from("posts")
      .update({
        image_url: null,
        image_storage_path: null,
        image_alt_text: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/posts/upload-image", error);
    return NextResponse.json(
      { error: "Failed to remove image" },
      { status: 500 }
    );
  }
}
