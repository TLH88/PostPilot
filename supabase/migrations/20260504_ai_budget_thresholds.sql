-- BP-085 Phase 3: per-user $ budget thresholds + auto-pause + alert log.
-- Additive only. null monthly_usd_limit = unlimited.
-- Team-burn alert default $30/mo (BP-123 cost study recommendation #7).
--
-- Note on FK target: BP-085 Phase 1 keys `ai_usage_events.user_id` to
-- `auth.users.id`. `user_profiles.id` is a distinct surrogate key. We
-- target `auth.users(id)` here so the threshold/alert rows align with
-- the events feed used by the budget evaluator.

CREATE TABLE IF NOT EXISTS ai_budget_thresholds (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_usd_limit numeric(10,4),
  is_paused boolean NOT NULL DEFAULT false,
  paused_at timestamptz,
  paused_reason text,
  team_burn_alert_threshold_usd numeric(10,4) NOT NULL DEFAULT 30.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_budget_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own threshold" ON ai_budget_thresholds;
CREATE POLICY "users see own threshold" ON ai_budget_thresholds
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ai_budget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('threshold_exceeded','auto_paused','team_burn_alert','manual_unpause')),
  threshold_usd numeric(10,4),
  actual_usd numeric(10,4) NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_budget_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_budget_alerts_user_period_idx
  ON ai_budget_alerts (user_id, period_end DESC);
