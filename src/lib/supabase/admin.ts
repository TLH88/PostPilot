import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client with service role privileges.
 * Bypasses RLS — use ONLY in admin API routes and server-side admin pages.
 * Never expose this client or its results directly to non-admin users.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Check if the given email is in the ADMIN_EMAILS whitelist.
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Verify the current user is an admin. Returns the user or null.
 * Uses the regular Supabase client for auth, then checks against ADMIN_EMAILS.
 */
export async function verifyAdmin() {
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}
