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
 * Synchronous check against the ADMIN_EMAILS env var only. Kept for
 * legacy callers that can't await — but prefer verifyAdmin() which also
 * checks the admin_users table.
 */
export function isAdminEmailEnvOnly(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Back-compat alias. New code: use isAdminEmailEnvOnly explicitly or
 * verifyAdmin() for full check (env + DB).
 */
export const isAdminEmail = isAdminEmailEnvOnly;

/**
 * Check whether an email is in the admin_users table (case-insensitive).
 * Service-role only — bypasses RLS. The unique index on lower(email)
 * makes this a single-row index lookup.
 */
export async function isAdminEmailInDb(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Verify the current user is an admin. Returns the user or null.
 *
 * Authoritative check: ADMIN_EMAILS env var (bootstrap, can't be removed
 * from UI) OR admin_users table (DB-managed, can be edited at runtime
 * by existing admins). The env var is the safety net so a wiped DB
 * still leaves owner access.
 */
export async function verifyAdmin() {
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  if (isAdminEmailEnvOnly(user.email)) return user;
  if (await isAdminEmailInDb(user.email)) return user;

  return null;
}
