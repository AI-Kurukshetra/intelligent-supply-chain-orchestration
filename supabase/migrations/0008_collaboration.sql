CREATE TABLE sop_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  cycle_name text NOT NULL,
  cycle_month integer NOT NULL CHECK (cycle_month BETWEEN 1 AND 12),
  cycle_year integer NOT NULL,
  status text NOT NULL DEFAULT 'statistical_forecast' CHECK (status IN ('statistical_forecast','demand_review','supply_review','financial_reconciliation','executive_review','complete')),
  step_due_dates jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sop_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  sop_cycle_id uuid NOT NULL REFERENCES sop_cycles,
  title text NOT NULL,
  description text,
  owner_id uuid REFERENCES profiles,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled','overdue')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE capacity_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  supplier_id uuid NOT NULL REFERENCES suppliers,
  product_id uuid NOT NULL REFERENCES products,
  period_start date NOT NULL,
  period_end date NOT NULL,
  available_qty numeric(14,4) NOT NULL,
  committed_qty numeric(14,4),
  lead_time_days integer,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged','rejected')),
  submitted_by uuid REFERENCES profiles,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_sop_cycles" ON sop_cycles USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_sop_actions" ON sop_actions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_capacity_submissions" ON capacity_submissions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_sop_cycles_updated_at BEFORE UPDATE ON sop_cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sop_actions_updated_at BEFORE UPDATE ON sop_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_capacity_submissions_updated_at BEFORE UPDATE ON capacity_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();