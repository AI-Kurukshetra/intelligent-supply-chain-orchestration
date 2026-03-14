CREATE TABLE planning_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  cycle_name text NOT NULL,
  cycle_type text NOT NULL CHECK (cycle_type IN ('mrp','sop','adhoc')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','running','review','approved','locked')),
  horizon_start date NOT NULL,
  horizon_end date NOT NULL,
  created_by uuid REFERENCES profiles,
  approved_by uuid REFERENCES profiles,
  approved_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE planned_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  planning_cycle_id uuid NOT NULL REFERENCES planning_cycles,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  order_type text NOT NULL CHECK (order_type IN ('production','purchase','transfer')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','firmed','released','completed','cancelled')),
  quantity numeric(14,4) NOT NULL,
  uom text NOT NULL DEFAULT 'EA',
  planned_start_date date NOT NULL,
  planned_end_date date NOT NULL,
  due_date date NOT NULL,
  supplier_id uuid REFERENCES suppliers,
  firm_planned boolean NOT NULL DEFAULT false,
  pegging jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_planned_orders_cycle ON planned_orders (tenant_id, planning_cycle_id, status);

CREATE TABLE open_supply_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  order_type text NOT NULL,
  external_order_id text,
  quantity numeric(14,4) NOT NULL,
  confirmed_qty numeric(14,4),
  expected_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partial','closed')),
  source_system text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planning_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_supply_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_planning_cycles" ON planning_cycles USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_planned_orders" ON planned_orders USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_open_supply_orders" ON open_supply_orders USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_planning_cycles_updated_at BEFORE UPDATE ON planning_cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_planned_orders_updated_at BEFORE UPDATE ON planned_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_open_supply_orders_updated_at BEFORE UPDATE ON open_supply_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();