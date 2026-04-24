/**
 * BP-131: Storage object cleanup for account deletion.
 *
 * Supabase Storage objects do NOT cascade with auth.users deletion.
 * Files in `resumes` and `post-images` buckets persist forever unless
 * explicitly removed — direct GDPR exposure (uploaded resumes can
 * contain PII, name, employment history).
 *
 * Convention in this project: every user upload is keyed under the
 * user's id at the path root, e.g.:
 *   resumes/<user_id>/<filename>
 *   post-images/<user_id>/<filename>
 *
 * This helper lists every object under the user's prefix in each bucket
 * and removes them. Failure must hard-fail the calling deletion flow —
 * partial deletion is worse than no deletion.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const USER_BUCKETS = ["resumes", "post-images"] as const;
const PAGE_SIZE = 100;

export interface StorageCleanupResult {
  bucket: string;
  removed: number;
  failed: string[];
}

/**
 * Delete every storage object owned by the given user across all known
 * user-content buckets. Returns per-bucket counts; throws on any
 * unexpected error.
 */
export async function cleanupUserStorage(
  admin: SupabaseClient,
  userId: string
): Promise<StorageCleanupResult[]> {
  const results: StorageCleanupResult[] = [];

  for (const bucket of USER_BUCKETS) {
    const removed: string[] = [];
    const failed: string[] = [];

    let offset = 0;
    while (true) {
      const { data: objects, error: listErr } = await admin.storage
        .from(bucket)
        .list(userId, { limit: PAGE_SIZE, offset });

      if (listErr) {
        // Bucket might not exist on a fresh project — skip rather than fail.
        if (listErr.message.toLowerCase().includes("not found")) break;
        throw new Error(
          `[storage-cleanup] Failed to list ${bucket}/${userId}: ${listErr.message}`
        );
      }

      if (!objects || objects.length === 0) break;

      const paths = objects
        .filter((o) => o.name && !o.id?.startsWith(".")) // skip placeholders
        .map((o) => `${userId}/${o.name}`);

      if (paths.length === 0) break;

      const { error: removeErr } = await admin.storage.from(bucket).remove(paths);
      if (removeErr) {
        failed.push(...paths);
        throw new Error(
          `[storage-cleanup] Failed to remove ${paths.length} object(s) from ${bucket}: ${removeErr.message}`
        );
      }
      removed.push(...paths);

      // If we got fewer than PAGE_SIZE results, we're done.
      if (objects.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    results.push({ bucket, removed: removed.length, failed });
  }

  return results;
}
