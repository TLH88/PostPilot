import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LaunchPadHome } from "@/components/launch-pad/launch-pad-home";
import { MobileLaunchPad } from "@/components/launch-pad/mobile-launch-pad";

/**
 * BP-099 — Launch Pad route.
 *
 * Default post-login destination for every authenticated user. Renders
 * the four-card launcher. The full Dashboard remains at `/dashboard`
 * and is reachable from the sidebar — Launch Pad is additive, not a
 * replacement.
 *
 * Server component on purpose so the user identity / display name come
 * from the same auth pathway the rest of the (app) layout uses, with
 * no extra round trip on the client. The mobile + desktop shells below
 * are both client components (button styling depends on `buttonVariants`
 * from a "use client" module — see launch-pad-home.tsx for the
 * rationale).
 *
 * BP-099 Phase 2 (2026-05-04): mobile shell added. Below the Tailwind
 * `md` breakpoint (768px) the page renders `<MobileLaunchPad />` —
 * stacked cards + bottom tab bar + FAB. At and above `md` the original
 * desktop launcher (`<LaunchPadHome />`) renders unchanged. Visibility
 * is controlled purely by Tailwind responsive classes (`hidden md:block`
 * / `md:hidden`) — no JS user-agent sniffing or `useMediaQuery`, so
 * server render and client hydration always agree.
 */
export default async function LaunchPadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const userName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "there";

  return (
    <>
      {/* Mobile shell — only rendered visually below `md` (768px). */}
      <div className="md:hidden">
        <MobileLaunchPad userName={userName} />
      </div>

      {/* Desktop launcher — unchanged from Phase 1, gated to `md` and up. */}
      <div className="hidden md:block">
        <LaunchPadHome userName={userName} />
      </div>
    </>
  );
}
