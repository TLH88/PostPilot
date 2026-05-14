-- BP-164-b: Admin email audit log.
--
-- Append-only record of every email an admin sends to a user through
-- the admin User Management page. Source of truth for "last contacted",
-- "who reached out to this user", and compliance / accountability.
--
-- Snapshots recipient email + name + sender's email so the row stays
-- readable after either party is deleted. Both FK columns use ON DELETE
-- SET NULL.
--
-- Status field tracks send lifecycle in case bounces/complaints are
-- reported back via Resend webhooks later. For now writes happen only
-- on successful Resend acceptance.

CREATE TABLE IF NOT EXISTS public.admin_email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who sent. NULL after the admin's account is deleted.
  sent_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by_email   text NOT NULL,

  -- Who received. NULL after the recipient's account is deleted.
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email   text NOT NULL,
  recipient_full_name text,

  -- Message content + provenance.
  sender_key      text NOT NULL CHECK (sender_key IN ('noreply','hello','news','support')),
  subject         text NOT NULL,
  body_html       text NOT NULL,           -- sanitized HTML rendered into the email
  body_plain      text,                    -- optional plain-text fallback for search

  -- Resend response.
  resend_message_id text,
  status          text NOT NULL DEFAULT 'sent'
                  CHECK (status IN ('sent','failed','bounced','complained','delivered')),
  failure_reason  text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_email_log_recipient_user_id
  ON public.admin_email_log (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_email_log_sent_by
  ON public.admin_email_log (sent_by, created_at DESC);

-- RLS: locked down by default.
ALTER TABLE public.admin_email_log ENABLE ROW LEVEL SECURITY;

-- No client-side access; all reads and writes go through the admin API
-- routes using the service-role client. No policies = no access for
-- authenticated/anon roles, which is the intent.

COMMENT ON TABLE public.admin_email_log IS
  'BP-164-b: append-only audit of admin → user emails. Service-role only.';
