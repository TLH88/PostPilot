-- BP-085 Phase 1: Shell of the alerts table. Used for logger failure
-- alerts in Phase 1; fully populated with budget/abuse/rate-limit alerts
-- in Phase 3.

CREATE TABLE ai_usage_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  context jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_alerts_unack_idx ON ai_usage_alerts (acknowledged, created_at DESC)
  WHERE acknowledged = false;

ALTER TABLE ai_usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own alerts" ON ai_usage_alerts FOR SELECT
  USING (auth.uid() = user_id);
