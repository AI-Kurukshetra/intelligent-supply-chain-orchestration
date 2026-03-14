CREATE TABLE kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  kpi_code text NOT NULL,
  kpi_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  granularity text NOT NULL CHECK (granularity IN ('daily','weekly','monthly')),
  dimension jsonb NOT NULL DEFAULT '{}',
  value numeric(18,6),
  uom text,
  trend_direction text CHECK (trend_direction IN ('up','down','flat')),
  vs_prior_period_pct numeric(8,4),
  vs_target_pct numeric(8,4),
  target_value numeric(18,6),
  calculated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kpi_snapshots_latest ON kpi_snapshots (tenant_id, kpi_code, period_start DESC);

CREATE TABLE report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  name text NOT NULL,
  report_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  output_format text NOT NULL DEFAULT 'excel' CHECK (output_format IN ('pdf','excel')),
  created_by uuid REFERENCES profiles,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_kpi_snapshots" ON kpi_snapshots USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_report_definitions" ON report_definitions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_report_definitions_updated_at BEFORE UPDATE ON report_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();