-- BP-085 Phase 1: Core usage tracking table for AI cost monitoring.
-- One row per AI request, capturing provider, model, tokens, cost, and
-- provider fallback metadata from the Vercel AI Gateway.

CREATE TABLE ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid,

  -- What ran
  route text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  source text NOT NULL,

  -- Token accounting (all nullable to tolerate partial data)
  input_tokens integer,
  output_tokens integer,
  cached_tokens integer,
  reasoning_tokens integer,

  -- Cost
  cost_usd numeric(10,6),
  cached_savings_usd numeric(10,6),
  cost_source text NOT NULL DEFAULT 'estimated',

  -- Provider fallback monitoring
  attempted_providers text[],
  final_provider text,

  -- Outcome
  success boolean NOT NULL DEFAULT true,
  error_code text,

  -- Correlation
  generation_id text,
  latency_ms integer,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_events_user_created_idx ON ai_usage_events (user_id, created_at DESC);
CREATE INDEX ai_usage_events_created_idx ON ai_usage_events (created_at DESC);
CREATE INDEX ai_usage_events_provider_created_idx ON ai_usage_events (provider, created_at DESC);
CREATE INDEX ai_usage_events_route_created_idx ON ai_usage_events (route, created_at DESC);
CREATE INDEX ai_usage_events_error_idx ON ai_usage_events (error_code, created_at DESC)
  WHERE error_code IS NOT NULL;
CREATE INDEX ai_usage_events_gen_id_idx ON ai_usage_events (generation_id)
  WHERE generation_id IS NOT NULL;

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage" ON ai_usage_events FOR SELECT
  USING (auth.uid() = user_id);
