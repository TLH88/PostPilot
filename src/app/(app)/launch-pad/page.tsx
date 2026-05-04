import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LaunchPadHome } from "@/components/launch-pad/launch-pad-home";

/**
 * BP-099 — Launch Pad route.
 *
 * Default post-login destination for every authenticated user. Renders
 * the four-card launcher (`<LaunchPadHome />`). The full Dashboard
 * remains at `/dashboard` and is reachable from the sidebar — Launch
 * Pad is additive, not a replacement.
 *
 * Server component on purpose so the user identity / display name come
 * from the same auth pathway the rest of the (app) layout uses, with
 * no extra round trip on the client. The component itself is a client
 * component (button styling depends on `buttonVariants` from a
 * "use client" module — see launch-pad-home.tsx for the rationale).
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

  return <LaunchPadHome userName={userName} />;
}
