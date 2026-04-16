/**
 * Server-side workspace helper — reads the active workspace cookie.
 * Use from Server Components or API routes.
 */
import { cookies } from "next/headers";
import { ACTIVE_WORKSPACE_KEY } from "@/lib/workspace";

/**
 * Get the active workspace ID from cookies (server-side only).
 * Returns null for personal mode.
 */
export async function getActiveWorkspaceIdServer(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_WORKSPACE_KEY)?.value;
  return value ? decodeURIComponent(value) : null;
}
