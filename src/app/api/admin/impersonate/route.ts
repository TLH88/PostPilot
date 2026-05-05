import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import {
  STASH_COOKIE_NAME,
  STASH_TTL_MS,
  signStash,
} from "@/lib/admin/impersonation-stash";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find user by email
  const { data: authData } = await supabase.auth.admin.listUsers();
  const user = authData?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return NextResponse.json({ error: `No user found: ${email}` }, { status: 404 });
  }

  // Generate magic link
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: user.email!,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: `Failed to generate link: ${linkError?.message}` },
      { status: 500 }
    );
  }

  const { hashed_token } = linkData.properties;
  const callbackUrl = `/callback?token_hash=${hashed_token}&type=magiclink&next=/launch-pad`;

  console.log(JSON.stringify({
    level: "warn",
    context: "admin/impersonate",
    adminEmail: admin.email,
    targetEmail: email,
    timestamp: new Date().toISOString(),
  }));

  const response = NextResponse.json({ callbackUrl, email: user.email });
  response.cookies.set(STASH_COOKIE_NAME, signStash(admin.email!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(STASH_TTL_MS / 1000),
    path: "/",
  });
  return response;
}
