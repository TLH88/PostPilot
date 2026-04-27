-- BP-130: tier_waitlist table — captures interest in tiers that aren't
-- yet generally available (Team and Enterprise at GTM launch).
--
-- Anonymous submission is allowed. Email is required; tier is required;
-- message is optional. user_id is set when the submitter happens to be
-- authenticated (informational; not required for anonymous flow).
--
-- Reads are admin-only via the service-role API endpoint at
-- /api/admin/waitlist. RLS denies SELECT to authenticated users; writes
-- are unrestricted (anonymous role + authenticated role can both INSERT)
-- because the form has no auth requirement.

CREATE TABLE IF NOT EXISTS public.tier_waitlist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  tier         text NOT NULL CHECK (tier IN ('team', 'enterprise')),
  message      text,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- IP address (best-effort; behind Vercel/Cloudflare so this is the proxy
  -- forwarded value). Used only for rate limiting + abuse triage.
  ip_address   text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Admin workflow fields.
  contacted_at timestamptz,
  notes        text
);

CREATE INDEX IF NOT EXISTS tier_waitlist_tier_created_idx
  ON public.tier_waitlist (tier, created_at DESC);

-- Rate-limiting helper index: same email submitting repeatedly.
CREATE INDEX IF NOT EXISTS tier_waitlist_email_created_idx
  ON public.tier_waitlist (email, created_at DESC);

CREATE INDEX IF NOT EXISTS tier_waitlist_ip_created_idx
  ON public.tier_waitlist (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

COMMENT ON TABLE public.tier_waitlist IS
  'BP-130: warm leads for the Team and Enterprise tiers while those subscriptions are deferred. Owner reaches out via the email field when those tiers go GA.';

ALTER TABLE public.tier_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can INSERT a waitlist row. The waitlist
-- form on /pricing is anonymous-friendly. Bot/abuse mitigation lives in
-- the API route (rate limiting); RLS just doesn't gate writes.
CREATE POLICY "anyone can submit waitlist"
ON public.tier_waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- No SELECT policy granted to authenticated. Reads happen server-side
-- through the admin API (service-role bypasses RLS), gated by
-- verifyAdmin().
