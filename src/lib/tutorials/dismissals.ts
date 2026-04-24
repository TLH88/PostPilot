/**
 * BP-121 — tutorial dismissal helpers for the host app.
 *
 * Uses the app's own Supabase client (not the SDK's duck-typed adapter) so
 * we can run list queries that the SDK's minimal interface can't express.
 * Backed by the `tutorial_progress` table's `dismissed` + `dismissed_at`
 * columns added in migration `20260424_tutorial_dismissals.sql`.
 *
 * Per-tutorial granularity; reversible from Settings.
 */

import { createClient } from "@/lib/supabase/client";

/** Permanently dismiss a tutorial ("Don't show again"). Idempotent. */
export async function dismissTutorial(
  userId: string,
  tutorialId: string
): Promise<void> {
  const supabase = createClient();
  await supabase.from("tutorial_progress").upsert(
    {
      user_id: userId,
      tutorial_id: tutorialId,
      dismissed: true,
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tutorial_id" }
  );
}

/** Check whether a specific tutorial is dismissed for this user. */
export async function isTutorialDismissed(
  userId: string,
  tutorialId: string
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tutorial_progress")
    .select("dismissed")
    .eq("user_id", userId)
    .eq("tutorial_id", tutorialId)
    .maybeSingle();
  return data?.dismissed === true;
}

/** List every tutorial the user has dismissed. Returns tutorial_id strings. */
export async function listDismissedTutorials(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tutorial_progress")
    .select("tutorial_id")
    .eq("user_id", userId)
    .eq("dismissed", true);
  return (data ?? []).map((r) => r.tutorial_id as string);
}

/** Undo a dismissal so the tutorial can be surfaced again. */
export async function reEnableTutorial(
  userId: string,
  tutorialId: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("tutorial_progress")
    .update({
      dismissed: false,
      dismissed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("tutorial_id", tutorialId);
}

/** Clear every dismissal for this user — the "Reset all tutorials" button. */
export async function resetAllDismissals(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("tutorial_progress")
    .update({
      dismissed: false,
      dismissed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("dismissed", true);
}
