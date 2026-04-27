/**
 * BP-141: Auto-version snapshot on autosave (resilience).
 *
 * Encapsulates the "maybe write an auto-kind post_versions row" logic so the
 * giant posts/[id]/page.tsx stays clean. Imported only by the client component,
 * but this file itself has NO "use client" directive — it exports plain values
 * and an async function, so it is safe to tree-shake in either environment.
 */

import type { MutableRefObject } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimum elapsed ms between two auto snapshots for the same post. */
export const AUTOSAVE_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * maybeWriteAutoSnapshot
 *
 * Writes an `auto`-kind row to `post_versions` if ALL of the following hold:
 *  1. At least AUTOSAVE_SNAPSHOT_INTERVAL_MS has elapsed since the ref timestamp.
 *  2. The new content differs from the content recorded in the snapshot ref.
 *
 * On success it updates both refs so the next call measures from this snapshot.
 * On failure it logs a warning but does NOT throw — autosave resilience must
 * never block the primary save path.
 *
 * @param supabase   - Supabase client (auth user scope).
 * @param postId     - UUID of the post being autosaved.
 * @param userId     - UUID of the authenticated user.
 * @param title      - Current post title (may be null/empty).
 * @param content    - Current post content after the autosave succeeded.
 * @param nextVersionNumber - The next sequential version_number for this post.
 * @param lastAutoSnapshotAtRef - React ref tracking the timestamp of the last auto snapshot.
 * @param lastAutoSnapshotContentRef - React ref tracking the content of the last auto snapshot.
 */
export async function maybeWriteAutoSnapshot({
  supabase,
  postId,
  userId,
  title,
  content,
  nextVersionNumber,
  lastAutoSnapshotAtRef,
  lastAutoSnapshotContentRef,
}: {
  supabase: SupabaseClient;
  postId: string;
  userId: string;
  title: string;
  content: string;
  nextVersionNumber: number;
  lastAutoSnapshotAtRef: MutableRefObject<number>;
  lastAutoSnapshotContentRef: MutableRefObject<string>;
}): Promise<boolean> {
  const now = Date.now();
  const elapsed = now - lastAutoSnapshotAtRef.current;

  // Condition 1: time-window gate
  if (elapsed < AUTOSAVE_SNAPSHOT_INTERVAL_MS) return false;

  // Condition 2: content must have actually changed vs last snapshot
  if (content === lastAutoSnapshotContentRef.current) return false;

  try {
    const { error } = await supabase.from("post_versions").insert({
      post_id: postId,
      user_id: userId,
      title: title || null,
      content,
      version_number: nextVersionNumber,
      label: null, // auto snapshots carry no user label
      kind: "auto",
    });

    if (error) {
      // Non-fatal — log but don't surface to the user
      console.warn("[BP-141] auto-snapshot insert failed:", error.message);
      return false;
    }

    // Update tracking refs only on success
    lastAutoSnapshotAtRef.current = now;
    lastAutoSnapshotContentRef.current = content;
    return true;
  } catch (err) {
    console.warn("[BP-141] auto-snapshot unexpected error:", err);
    return false;
  }
}
