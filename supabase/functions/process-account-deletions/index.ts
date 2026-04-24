/**
 * BP-131: Daily cron — promote soft-deleted accounts to hard-deleted
 * once their grace period elapses.
 *
 * Triggered hourly by pg_cron (cheap; only acts when there are due
 * rows). JWT signature verified with PG_CRON_JWT_SECRET, same pattern
 * as publish-scheduled-posts.
 *
 * Flow per due record:
 *   1. List storage objects under <user_id>/ in resumes + post-images
 *   2. Remove them
 *   3. supabase.auth.admin.deleteUser → cascades public.* tables
 *   4. Update account_deletions row to status=hard_deleted
 *
 * Failure handling:
 *   - Storage failure: skip this user, retry next run, log error.
 *   - Auth delete failure: same.
 *   - Don't poison the whole batch on one bad record.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function getEnv(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...(data ?? {}) };
  const out = JSON.stringify(entry);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = Uint8Array.from(
    atob(signature.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
  return crypto.subtle.verify("HMAC", key, sigBytes, data);
}

const USER_BUCKETS = ["resumes", "post-images"];

/**
 * Solo-owned workspaces must be removed before auth.admin.deleteUser
 * because workspaces.owner_id is ON DELETE RESTRICT (BP-131). Mirrors
 * the cleanupOwnedSoloWorkspaces helper in src/lib/account/delete-user.ts.
 *
 * Multi-member workspaces should NEVER reach this point — the soft-delete
 * preflight blocks them at admin/self deletion time. We re-assert here
 * defensively and skip the user (whole batch row fails) if violated.
 */
async function cleanupOwnedSoloWorkspaces(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: owned, error: listErr } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", userId);
  if (listErr) throw new Error(`list owned workspaces: ${listErr.message}`);
  if (!owned || owned.length === 0) return;

  const ids: string[] = [];
  for (const ws of owned) {
    const { count, error: countErr } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", ws.id);
    if (countErr) throw new Error(`count members for ${ws.name}: ${countErr.message}`);
    if ((count ?? 0) > 1) {
      throw new Error(
        `Workspace "${ws.name}" has ${count} members; preflight should have blocked this. Skipping.`
      );
    }
    ids.push(ws.id);
  }

  // Clear non-cascading workspace_id refs; rows themselves are removed
  // when the auth.users CASCADE fires on user_id below.
  for (const table of ["posts", "ideas", "content_library", "post_templates"]) {
    const { error } = await supabase.from(table).update({ workspace_id: null }).in("workspace_id", ids);
    if (error) throw new Error(`clear workspace_id on ${table}: ${error.message}`);
  }

  const { error: wsErr } = await supabase.from("workspaces").delete().in("id", ids);
  if (wsErr) throw new Error(`delete solo workspaces: ${wsErr.message}`);
}

async function cleanupStorage(supabase: ReturnType<typeof createClient>, userId: string) {
  for (const bucket of USER_BUCKETS) {
    let offset = 0;
    while (true) {
      const { data: objects, error } = await supabase.storage
        .from(bucket)
        .list(userId, { limit: 100, offset });
      if (error) {
        if (error.message?.toLowerCase().includes("not found")) break;
        throw new Error(`list ${bucket}/${userId}: ${error.message}`);
      }
      if (!objects || objects.length === 0) break;
      const paths = objects.filter((o) => o.name).map((o) => `${userId}/${o.name}`);
      if (paths.length === 0) break;
      const { error: rmErr } = await supabase.storage.from(bucket).remove(paths);
      if (rmErr) throw new Error(`remove ${bucket}/${userId}: ${rmErr.message}`);
      if (objects.length < 100) break;
      offset += 100;
    }
  }
}

Deno.serve(async (req) => {
  // Verify cron JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secret = getEnv("PG_CRON_JWT_SECRET");
  const valid = await verifyJwtSignature(token, secret);
  if (!valid) {
    log("warn", "Rejected unauthorized cron call");
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const now = new Date().toISOString();

  const { data: due, error: dueErr } = await supabase
    .from("account_deletions")
    .select("id, user_id, user_email")
    .eq("status", "pending_grace")
    .lte("scheduled_hard_delete_at", now);

  if (dueErr) {
    log("error", "Failed to query due deletions", { error: dueErr.message });
    return new Response(JSON.stringify({ error: dueErr.message }), { status: 500 });
  }

  if (!due || due.length === 0) {
    log("info", "No accounts due for hard deletion");
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  let succeeded = 0;
  const failures: Array<{ audit_id: string; user_id: string | null; reason: string }> = [];

  for (const row of due) {
    if (!row.user_id) {
      log("warn", "Audit row has no user_id; marking hard_deleted as no-op", { audit_id: row.id });
      await supabase
        .from("account_deletions")
        .update({ status: "hard_deleted", hard_deleted_at: now })
        .eq("id", row.id);
      succeeded++;
      continue;
    }

    try {
      await cleanupStorage(supabase, row.user_id);
    } catch (err) {
      const reason = `storage cleanup failed: ${(err as Error).message}`;
      log("error", reason, { audit_id: row.id, user_id: row.user_id });
      failures.push({ audit_id: row.id, user_id: row.user_id, reason });
      continue;
    }

    try {
      await cleanupOwnedSoloWorkspaces(supabase, row.user_id);
    } catch (err) {
      const reason = `workspace cleanup failed: ${(err as Error).message}`;
      log("error", reason, { audit_id: row.id, user_id: row.user_id });
      failures.push({ audit_id: row.id, user_id: row.user_id, reason });
      continue;
    }

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(row.user_id);
    if (deleteErr) {
      const reason = `auth.admin.deleteUser failed: ${deleteErr.message}`;
      log("error", reason, { audit_id: row.id, user_id: row.user_id });
      failures.push({ audit_id: row.id, user_id: row.user_id, reason });
      continue;
    }

    await supabase
      .from("account_deletions")
      .update({ status: "hard_deleted", hard_deleted_at: new Date().toISOString() })
      .eq("id", row.id);

    log("info", "Hard-deleted account", { audit_id: row.id, email: row.user_email });
    succeeded++;
  }

  return new Response(
    JSON.stringify({ processed: due.length, succeeded, failures }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
