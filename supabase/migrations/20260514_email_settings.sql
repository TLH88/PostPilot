-- BP-166: Admin-managed email settings.
--
-- Four tables for admin-controlled email content:
--
-- email_greetings   — opening lines like "Hi {firstName}," / "Hey there,"
-- email_signatures  — closing lines like "— The PostPilot Team"
-- email_footers     — multiple-per-email blocks (unsubscribe, GDPR, etc.)
-- email_templates   — fully-composed system emails (Welcome, Trial expiry,
--                     Usage report, etc.) keyed for lookup by cron jobs.
--
-- All four are append/update by admins only; reads through service-role
-- API routes that wrap them for display. RLS enabled, no policies =
-- service-role only.

-- ─────────────────────────────────────────────────────────────────────
-- Greetings
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_greetings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  content     text NOT NULL,            -- supports {firstName} placeholder
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_greetings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- Signatures
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_signatures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  content     text NOT NULL,            -- HTML allowed (sanitized at API)
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- Footers (can attach multiple per email — e.g. unsubscribe + GDPR)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_footers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  content     text NOT NULL,            -- HTML allowed (sanitized at API)
  kind        text NOT NULL DEFAULT 'custom'
              CHECK (kind IN ('unsubscribe','gdpr','governance','custom','noreply_notice')),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_footers ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- Templates (system-generated emails)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable lookup key used by cron jobs / event handlers. System keys
  -- are seeded below; admin can add custom (non-system) templates with
  -- any unique key for use as composer presets.
  key             text NOT NULL UNIQUE,

  -- Display + admin metadata
  name            text NOT NULL,
  description     text,

  -- Email content
  subject         text NOT NULL,
  body_html       text NOT NULL,

  -- Composition pieces (optional references — NULL means use defaults)
  sender_key      text NOT NULL DEFAULT 'support'
                  CHECK (sender_key IN ('noreply','hello','news','support')),
  show_logo       boolean NOT NULL DEFAULT true,
  greeting_id     uuid REFERENCES public.email_greetings(id) ON DELETE SET NULL,
  signature_id    uuid REFERENCES public.email_signatures(id) ON DELETE SET NULL,
  footer_ids      uuid[] DEFAULT '{}',

  -- is_system templates are seeded by migration and used by cron jobs.
  -- They can be EDITED but not DELETED (enforced at API layer).
  is_system       boolean NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_templates_key
  ON public.email_templates (key);

-- ─────────────────────────────────────────────────────────────────────
-- Seed defaults
-- ─────────────────────────────────────────────────────────────────────

-- One default greeting/signature/footer so the system has something to
-- use immediately. Admin can add more, edit, or change which is default.

INSERT INTO public.email_greetings (name, content, is_default) VALUES
  ('Casual', 'Hi {firstName},', true),
  ('Formal', 'Hello {firstName},', false),
  ('Warm', 'Hey {firstName} 👋', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.email_signatures (name, content, is_default) VALUES
  ('Team', E'— The PostPilot Team', true),
  ('Support', E'— PostPilot Support', false),
  ('Founder', E'— Tony at PostPilot', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.email_footers (name, content, kind, sort_order) VALUES
  ('Unsubscribe link',
   '<a href="{unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a> from these emails at any time.',
   'unsubscribe', 10),
  ('GDPR notice',
   'You received this email because you are a registered PostPilot user. We process your data in accordance with our <a href="https://mypostpilot.app/privacy">Privacy Policy</a>.',
   'gdpr', 20),
  ('No-reply notice',
   'This is an automated message — replies are not monitored.',
   'noreply_notice', 30)
ON CONFLICT DO NOTHING;

-- System templates for the upcoming automated email waves. Seeded with
-- placeholder content so the admin sees what each one will say. Admin
-- can edit body/subject; the key is the stable identifier the cron uses.
INSERT INTO public.email_templates (key, name, description, subject, body_html, sender_key, is_system)
VALUES
  ('welcome',
   'Welcome',
   'Sent immediately after signup completion.',
   'Welcome to PostPilot, {firstName}!',
   '<p>Welcome aboard — we''re glad you''re here.</p><p>PostPilot helps you turn ideas into LinkedIn posts that sound like you. Your account is ready: <a href="https://mypostpilot.app/launch-pad">jump into the Launch Pad</a> to get started.</p>',
   'hello', true),
  ('first_post_celebration',
   'First post celebration',
   'Sent after a user publishes their first post.',
   '🎉 Your first PostPilot post is live!',
   '<p>Congrats on shipping your first post! Posting consistently is the hard part — and you''ve crossed the line.</p><p>Want to keep the momentum? <a href="https://mypostpilot.app/ideas">Brainstorm your next idea</a>.</p>',
   'hello', true),
  ('trial_expiry_3d',
   'Trial expiry — 3 days',
   'Sent 3 days before a user''s trial ends.',
   'Your PostPilot trial ends in 3 days',
   '<p>Just a heads-up — your PostPilot trial wraps up on {trialEndDate}.</p><p>To keep your account active, <a href="https://mypostpilot.app/settings/billing">add a payment method</a> any time before then.</p>',
   'hello', true),
  ('trial_expiry_1d',
   'Trial expiry — 1 day',
   'Sent the day before a user''s trial ends.',
   'Your PostPilot trial ends tomorrow',
   '<p>Tomorrow is the last day of your PostPilot trial.</p><p>If you''d like to keep your subscription active, <a href="https://mypostpilot.app/settings/billing">add a payment method now</a>. Otherwise no action needed — your account will switch to the free tier automatically.</p>',
   'hello', true),
  ('monthly_usage_report',
   'Monthly usage report',
   'Sent on the 1st of each month with last month''s usage summary.',
   'Your PostPilot {month} recap',
   '<p>Here''s a look at what you accomplished with PostPilot in {month}:</p><ul><li><strong>{postCount}</strong> posts created</li><li><strong>{publishedCount}</strong> posts published</li><li><strong>{ideaCount}</strong> ideas captured</li></ul><p>See the full breakdown on your <a href="https://mypostpilot.app/dashboard">dashboard</a>.</p>',
   'hello', true),
  ('inactivity_7d',
   'Inactivity nudge — 7 days',
   'Sent when a user has been inactive for 7 days.',
   'Still got those drafts waiting',
   '<p>Hi {firstName} — quick check-in. It''s been about a week since you posted.</p><p>If you have drafts queued up, they''re ready when you are: <a href="https://mypostpilot.app/posts">open your drafts</a>.</p>',
   'hello', true),
  ('inactivity_14d',
   'Inactivity nudge — 14 days',
   'Sent when a user has been inactive for 14 days.',
   'Got an idea waiting for words?',
   '<p>Hey {firstName} — it''s been a couple weeks. If you''ve got an idea swirling, give it a starting point: <a href="https://mypostpilot.app/ideas">capture it as an idea</a> and PostPilot can help you flesh it out.</p>',
   'hello', true),
  ('inactivity_30d',
   'Inactivity nudge — 30 days',
   'Sent when a user has been inactive for 30 days.',
   'Want to brainstorm something new?',
   '<p>Been a minute, {firstName}. No pressure — but if you''re feeling unsure what to post about, the <a href="https://mypostpilot.app/ideas?open=generate">brainstorm tool</a> can suggest topics based on your audience and voice.</p>',
   'hello', true),
  ('quota_warning_80',
   'Quota warning — 80%',
   'Sent when a user reaches 80% of their monthly quota.',
   'You''ve used 80% of your monthly PostPilot quota',
   '<p>Heads up — you''ve used <strong>80%</strong> of your monthly allotment on PostPilot.</p><p>You have <strong>{postsRemaining}</strong> posts left for this period. <a href="https://mypostpilot.app/settings/billing">Upgrade your plan</a> for more headroom.</p>',
   'hello', true),
  ('quota_warning_100',
   'Quota warning — 100% reached',
   'Sent when a user hits 100% of their monthly quota.',
   'You''ve hit your monthly PostPilot quota',
   '<p>You''ve reached your monthly post limit on PostPilot. New posts will be paused until your quota resets on {periodEndDate}.</p><p>Need more capacity sooner? <a href="https://mypostpilot.app/settings/billing">Upgrade your plan</a> to keep posting today.</p>',
   'hello', true),
  ('linkedin_token_expiring',
   'LinkedIn token expiring',
   'Sent 7 days before LinkedIn OAuth token expires.',
   'Reconnect your LinkedIn account this week',
   '<p>Your LinkedIn connection with PostPilot expires in 7 days. To keep publishing without interruption, please <a href="https://mypostpilot.app/settings/linkedin">reconnect your account</a> now.</p><p>It takes about 30 seconds — and avoids any failed publishes.</p>',
   'hello', true)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.email_greetings IS 'BP-166: admin-managed email greetings. Service-role only.';
COMMENT ON TABLE public.email_signatures IS 'BP-166: admin-managed email signatures. Service-role only.';
COMMENT ON TABLE public.email_footers IS 'BP-166: admin-managed email footers (multi-attachable). Service-role only.';
COMMENT ON TABLE public.email_templates IS 'BP-166: system + admin-managed email templates. Service-role only. is_system rows cannot be deleted (enforced at API).';
