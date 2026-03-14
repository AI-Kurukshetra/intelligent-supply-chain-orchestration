CREATE TABLE forecast_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  facility_id uuid REFERENCES facilities,
  horizon_weeks integer NOT NULL DEFAULT 13 CHECK (horizon_weeks BETWEEN 1 AND 104),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','dispatched','completed','completed_with_errors','failed')),
  product_ids uuid[] NOT NULL DEFAULT '{}',
  total_products integer NOT NULL DEFAULT 0,
  processed_products integer NOT NULL DEFAULT 0,
  failed_products integer NOT NULL DEFAULT 0,
  triggered_by uuid REFERENCES profiles,
  started_at timestamptz,
  completed_at timestamptz,
  result_summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE forecast_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_forecast_runs" ON forecast_runs
  USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE INDEX idx_forecast_runs_tenant_created_at ON forecast_runs (tenant_id, created_at DESC);
CREATE INDEX idx_forecast_runs_tenant_status ON forecast_runs (tenant_id, status, created_at DESC);

CREATE TRIGGER trg_forecast_runs_updated_at
  BEFORE UPDATE ON forecast_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
