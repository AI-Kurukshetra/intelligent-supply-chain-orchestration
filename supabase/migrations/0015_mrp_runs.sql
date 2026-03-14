CREATE TABLE mrp_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  planning_cycle_id uuid NOT NULL REFERENCES planning_cycles,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','completed_with_errors','failed')),
  total_products integer NOT NULL DEFAULT 0,
  processed_products integer NOT NULL DEFAULT 0,
  failed_products integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid REFERENCES profiles,
  summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mrp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  mrp_run_id uuid NOT NULL REFERENCES mrp_runs ON DELETE CASCADE,
  planning_cycle_id uuid NOT NULL REFERENCES planning_cycles,
  product_id uuid REFERENCES products,
  facility_id uuid REFERENCES facilities,
  planned_order_id uuid REFERENCES planned_orders,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  message_type text NOT NULL,
  title text NOT NULL,
  detail text,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mrp_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_mrp_runs" ON mrp_runs
  USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_mrp_messages" ON mrp_messages
  USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE INDEX idx_mrp_runs_cycle ON mrp_runs (tenant_id, planning_cycle_id, created_at DESC);
CREATE INDEX idx_mrp_messages_run ON mrp_messages (tenant_id, mrp_run_id, severity, created_at DESC);

CREATE TRIGGER trg_mrp_runs_updated_at
  BEFORE UPDATE ON mrp_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
