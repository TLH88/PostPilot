import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

/**
 * Admin-only endpoint for uploading images embedded in composer bodies.
 * Stores under post-images/email-uploads/<uuid>.<ext> and returns the
 * public URL. The post-images bucket is already public-read with admin
 * service-role writes, so we reuse it instead of provisioning a new
 * bucket for email assets.
 *
 * Accepts multipart/form-data with a single 'file' field. Caps each
 * upload at 5 MB (well under email-client image-render thresholds).
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

function extFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds ${Math.round(MAX_BYTES / 1024 / 1024)} MB limit` },
      { status: 413 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type "${file.type}" — allowed: png, jpg, gif, webp, svg` },
      { status: 415 },
    );
  }

  const supabase = createAdminClient();
  const ext = extFor(file.type);
  const path = `email-uploads/${crypto.randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from("post-images")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: "Upload failed", details: uploadErr.message },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
