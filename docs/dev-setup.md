# Local Development Setup

Short doc to get a fresh clone running locally, including the local-dev auth bypass that replaces the removed `/api/dev/auto-login` (BP-126).

## Prerequisites

- Node.js (version matching `package.json#engines`)
- `npm install` (or `pnpm` / `bun`, match your existing lockfile tooling)
- A working `.env.local` with Supabase + LinkedIn dev credentials

## Starting the dev server

```bash
npm run dev
```

Dev server runs on `http://localhost:3000`. The OAuth callback is configured for both `localhost` and the Vercel preview domain.

---

## Local-dev auth bypass (BP-126)

The former `/api/dev/auto-login` endpoint was removed on 2026-04-23 as an auth-bypass surface. This document describes its replacement — a route guarded by three independent checks that **cannot** run in production or preview environments.

### Why it's safe

1. **The route file is gitignored.** `src/app/api/dev/*` is excluded in `.gitignore`, so `src/app/api/dev/local-login/route.ts` is never committed. Each developer maintains their own local copy. If you cloned this repo, the file will not exist — restore it from a teammate or from the BP-126 PR history.

2. **Three independent gates, all enforced server-side:**
   - `NODE_ENV !== "development"` → 404
   - Request `Host` header not in `localhost`/`127.0.0.1`/`[::1]` → 404
   - `LOCAL_DEV_LOGIN_SECRET` missing or header `x-local-dev-secret` doesn't match → 404

3. **No env vars in Vercel.** All `LOCAL_DEV_LOGIN_*` variables live only in your personal `.env.local` (gitignored). They must **never** be added to Vercel project settings (production, preview, or development).

4. **The login page button is compile-time gated.** `process.env.NODE_ENV === "development"` is replaced at build time by Next.js. Production bundles have the button code tree-shaken out.

### Setup steps

1. **Recreate the route file** (if it's not already present on your machine):

   Path: `src/app/api/dev/local-login/route.ts`

   Ask a teammate for the current version or pull it from the BP-126 branch history. Do NOT commit it.

2. **Generate a shared secret.** Run one of:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # or
   openssl rand -hex 32
   ```

   This produces a 64-character hex string. Copy it.

3. **Add to `.env.local`**:

   ```
   # Local-dev auth bypass (BP-126). Never add these to Vercel.
   LOCAL_DEV_LOGIN_SECRET=<paste the hex string here>
   NEXT_PUBLIC_LOCAL_DEV_LOGIN_SECRET=<paste the SAME hex string here>
   LOCAL_DEV_LOGIN_EMAIL=tony.hungate@email.com
   ```

   - `LOCAL_DEV_LOGIN_SECRET` — server-side required header value.
   - `NEXT_PUBLIC_LOCAL_DEV_LOGIN_SECRET` — the same value, exposed to the client so the Dev Login button can send the header. Safe because it only compiles in dev builds.
   - `LOCAL_DEV_LOGIN_EMAIL` — the default account the Dev Login button signs you in as. Must be an existing user in your Supabase project (sign up through the normal LinkedIn flow first, then set the value here).

   **Gotchas (learned from real setup):**
   - **No quotes around the value.** Dotenv reads them literally, so `LOCAL_DEV_LOGIN_SECRET="abc"` becomes a 5-char value (`"abc"`) on the server but a 3-char value on the client → mismatch, 404.
   - **Both values must be byte-for-byte identical.** Copy-paste both from the same source; don't re-type one.
   - **`NEXT_PUBLIC_*` env vars are bundled at compile time.** After editing `.env.local`, fully restart the dev server (Ctrl+C, `npm run dev`) and hard-refresh the login page (Ctrl+Shift+R) — a mid-run env reload doesn't always re-bundle client code.

4. **Verify the env vars are NOT in Vercel.** Open your Vercel project → Settings → Environment Variables. None of `LOCAL_DEV_LOGIN_SECRET`, `NEXT_PUBLIC_LOCAL_DEV_LOGIN_SECRET`, `LOCAL_DEV_LOGIN_EMAIL` should appear there. If they do, remove them.

5. **Start the dev server** and visit `http://localhost:3000/login`. You should see a yellow "Local dev only" panel with a **Dev Login** button below the LinkedIn sign-in.

6. **Click Dev Login.** You'll be signed in as `LOCAL_DEV_LOGIN_EMAIL` and redirected to `/dashboard`.

### Debugging a 404

The route returns an opaque 404 when any gate fails (by design — never reveal the route exists). In development, the server terminal logs which gate blocked with a line like:

```
[dev/local-login] 404: x-local-dev-secret header value does not match server's LOCAL_DEV_LOGIN_SECRET (client length 12, server length 22)
```

Check the dev-server terminal whenever the Dev Login button 404s. Common messages:

- `NODE_ENV is production` → you ran `npm run start` instead of `npm run dev`.
- `host 'x.y.z' is not a loopback address` → you're hitting the server from a non-loopback IP (e.g., LAN). Use `localhost` in the browser URL.
- `LOCAL_DEV_LOGIN_SECRET is not set` → missing from `.env.local` or dev server hasn't reloaded it.
- `x-local-dev-secret header missing` → the login page bundle is stale. Hard-refresh after restarting.
- `does not match … (client length X, server length Y)` → values differ (or one has quotes). Regenerate and paste both from the same source.

### Using a different email

To log in as a different user for a single session, call the route directly with a query param:

```
http://localhost:3000/api/dev/local-login?email=test@postpilot.dev
```

(Requires the `x-local-dev-secret` header — the button handles this, so for ad-hoc testing use `curl` or a browser extension that can attach headers.)

The target email must correspond to an existing Supabase user.

### What to do if it stops working

- **Button doesn't appear:** verify `NODE_ENV=development` (it should be automatic under `npm run dev`) and that you're on `localhost` (not `192.168.x.x` etc.).
- **Button appears but returns 404:** one of the three gates failed. Most common causes: `LOCAL_DEV_LOGIN_SECRET` isn't set, or the client and server secrets don't match. Check both env vars are present and identical, then restart `npm run dev` so Next.js re-reads `.env.local`.
- **404 says `No Supabase user found`:** sign up via the LinkedIn flow first (at least once), then set `LOCAL_DEV_LOGIN_EMAIL` to that account's email.

### What NOT to do

- ❌ **Do not commit** `src/app/api/dev/local-login/route.ts`. The `.gitignore` rule prevents it by default; don't add allow-rules.
- ❌ **Do not add** `LOCAL_DEV_LOGIN_*` to Vercel env vars — not even to the "Development" environment. Vercel "Development" is still network-reachable.
- ❌ **Do not change** the three gates without security review. Each one is belt-and-suspenders against a different failure mode.
- ❌ **Do not reuse** the `x-local-dev-secret` value elsewhere. It exists to make the 404 behavior unambiguous for accidental hits.

---

## Other local-dev notes

- **Supabase migrations** apply via MCP against the production project (`rgzqhyniuzhqfxqrgsdd`) in this workflow. No local Supabase stack needed.
- **LinkedIn OAuth** redirect URIs are registered for both `https://www.mypostpilot.app` and local preview. If you need to add `http://localhost:3000` for direct OAuth testing, update the LinkedIn app config — but Dev Login above skips LinkedIn entirely for most workflows.
- **Standard workflow reminder:** Tony tests on live Vercel preview URLs, not local dev. Local dev is used for implementation iteration; feature verification happens against `postpilot-git-develop-*.vercel.app`. This doc covers local-dev ergonomics; it doesn't replace that workflow.
