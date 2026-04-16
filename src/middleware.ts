import { NextResponse, type NextRequest } from "next/server";
import { TEAM_FEATURES_ENABLED, isTeamRoute } from "@/lib/feature-flags";

/**
 * Next.js middleware.
 *
 * BP-094 / BP-098: When TEAM_FEATURES_ENABLED is false, redirect any request
 * targeting a Team-tier route (e.g., /workspace/*, /notifications, /activity)
 * to /dashboard. This prevents URL-driven access to pages whose UI is hidden
 * by the master feature flag.
 *
 * The check is purely env-based — no user lookup is required, so it stays
 * edge-safe and fast. Team-tier-vs-user-tier checks (i.e. blocking a Free
 * user from a Team page when the flag is ON) are handled by page-level
 * gating; this middleware exists specifically for the flag-OFF case.
 */
export function middleware(request: NextRequest) {
  if (!TEAM_FEATURES_ENABLED && isTeamRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = ""; // strip any query/hash that referenced the team route
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Limit middleware to the team-route prefixes for performance.
 * Static assets, _next, and API routes are excluded.
 */
export const config = {
  matcher: [
    "/workspace/:path*",
    "/notifications/:path*",
    "/activity/:path*",
  ],
};
