import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";
import {
  STASH_COOKIE_NAME,
  verifyStash,
} from "@/lib/admin/impersonation-stash";

/**
 * Exit admin impersonation: restore the original admin's session.
 *
 * Reads the HMAC-signed `pp_admin_stash` cookie set when impersonation
 * started, generates a fresh magic link for the admin, and runs the OTP
 * verification server-side so Supabase session cookies for the admin are
 * written onto the response.
 */
export async function POST() {
  const cookieStore = await cookies();
  const stash = cookieStore.get(STASH_COOKIE_NAME)?.value;

  const parsed = verifyStash(stash);
  if (!parsed) {
    return NextResponse.json(
      { error: "No active impersonation" },
      { status: 404 }
    );
  }

  // Defense-in-depth: even with a valid signature, only restore admins.
  if (!isAdminEmail(parsed.email)) {
    return NextResponse.json(
      { error: "Stashed identity is not an admin" },
      { status: 403 }
    );
  }

  const adminClient = createAdminClient();
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: parsed.email,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: `Failed to generate restore link: ${linkError?.message}` },
      { status: 500 }
    );
  }

  // Run verifyOtp server-side and capture the cookies it tries to set,
  // so we can attach them to our JSON response.
  const pendingCookies: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.length = 0;
          cookiesToSet.forEach((c) => pendingCookies.push(c));
        },
      },
    }
  );

  const { error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError) {
    return NextResponse.json(
      { error: `Failed to restore session: ${verifyError.message}` },
      { status: 500 }
    );
  }

  console.log(
    JSON.stringify({
      level: "warn",
      context: "admin/impersonate/exit",
      adminEmail: parsed.email,
      timestamp: new Date().toISOString(),
    })
  );

  const response = NextResponse.json({ ok: true });
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2]
    );
  }
  // Clear the stash.
  response.cookies.set(STASH_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
