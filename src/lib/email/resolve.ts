import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lookup helpers for the building blocks an email composer / cron job
 * needs to render an outbound email. All take an admin Supabase client
 * (service role) so they bypass RLS for service-role-only tables.
 */

export interface ResolvedGreeting {
  id: string;
  /** Raw content with placeholders intact, e.g. "Hi {firstName}," */
  content: string;
}

export interface ResolvedSignature {
  id: string;
  /** Sanitized HTML content. */
  content: string;
}

export interface ResolvedFooter {
  id: string;
  /** Sanitized HTML content. */
  content: string;
  sort_order: number;
}

export async function resolveGreeting(
  supabase: SupabaseClient,
  greetingId: string | null | undefined,
): Promise<ResolvedGreeting | null> {
  if (!greetingId) return null;
  const { data } = await supabase
    .from("email_greetings")
    .select("id, content")
    .eq("id", greetingId)
    .maybeSingle();
  return data ?? null;
}

export async function resolveSignature(
  supabase: SupabaseClient,
  signatureId: string | null | undefined,
): Promise<ResolvedSignature | null> {
  if (!signatureId) return null;
  const { data } = await supabase
    .from("email_signatures")
    .select("id, content")
    .eq("id", signatureId)
    .maybeSingle();
  return data ?? null;
}

export async function resolveFooters(
  supabase: SupabaseClient,
  footerIds: string[] | null | undefined,
): Promise<ResolvedFooter[]> {
  if (!footerIds || footerIds.length === 0) return [];
  const { data } = await supabase
    .from("email_footers")
    .select("id, content, sort_order")
    .in("id", footerIds);
  // Preserve sort_order (ascending), then fall back to caller order
  return (data ?? []).sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Substitute well-known placeholders in a string. Use for greeting +
 * subject lines. The `{name}` syntax matches what admins type in the
 * Email Settings UI.
 */
export function substitutePlaceholders(
  text: string,
  values: Record<string, string | undefined>,
): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    const v = values[key];
    return v ?? match;
  });
}
