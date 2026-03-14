CREATE TABLE demand_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_qty numeric(14,4) NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('erp_sales','manual','pos','ecommerce')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_demand_history_lookup ON demand_history (tenant_id, product_id, facility_id, period_start);

CREATE TABLE statistical_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  run_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  forecast_qty numeric(14,4) NOT NULL,
  lower_bound_qty numeric(14,4),
  upper_bound_qty numeric(14,4),
  confidence_pct numeric(5,2),
  model_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE forecast_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  period_start date NOT NULL,
  period_end date NOT NULL,
  statistical_qty numeric(14,4) NOT NULL,
  proposed_qty numeric(14,4) NOT NULL,
  reason text,
  reason_code text CHECK (reason_code IN ('promotion','new_customer','lost_customer','market_change','other')),
  proposed_by uuid REFERENCES profiles,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES profiles,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE forecast_accuracy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  run_id uuid NOT NULL,
  horizon_weeks integer NOT NULL,
  mape numeric(8,4),
  wmape numeric(8,4),
  bias numeric(8,4),
  mae numeric(14,4),
  calculated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE demand_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_demand_history" ON demand_history USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_statistical_forecasts" ON statistical_forecasts USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_forecast_overrides" ON forecast_overrides USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_forecast_accuracy" ON forecast_accuracy USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_forecast_overrides_updated_at BEFORE UPDATE ON forecast_overrides FOR EACH ROW EXECUTE FUNCTION set_updated_at();