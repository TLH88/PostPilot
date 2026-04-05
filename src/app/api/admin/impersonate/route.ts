import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";

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
  const callbackUrl = `/callback?token_hash=${hashed_token}&type=magiclink&next=/dashboard`;

  console.log(JSON.stringify({
    level: "warn",
    context: "admin/impersonate",
    adminEmail: admin.email,
    targetEmail: email,
    timestamp: new Date().toISOString(),
  }));

  return NextResponse.json({ callbackUrl, email: user.email });
}
