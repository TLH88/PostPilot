import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();

  // Build a Supabase client that writes session cookies to the redirect response.
  // We collect cookies during auth, then apply them to the response we return.
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
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

  /** Create a redirect response and attach any session cookies set by Supabase. */
  function redirectWithCookies(url: string) {
    const response = NextResponse.redirect(url);
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    }
    return response;
  }

  // Magic link OTP verification (used by admin impersonation)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink",
    });
    if (!error) {
      return redirectWithCookies(`${origin}${next}`);
    }
  }

  // Handle OAuth code exchange (LinkedIn login)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return redirectWithCookies(`${origin}${next}`);
      } else if (forwardedHost) {
        return redirectWithCookies(`https://${forwardedHost}${next}`);
      } else {
        return redirectWithCookies(`${origin}${next}`);
      }
    }
  }

  // If there's no code or an error occurred, redirect to login with an error
  return NextResponse.redirect(`${origin}/login`);
}
