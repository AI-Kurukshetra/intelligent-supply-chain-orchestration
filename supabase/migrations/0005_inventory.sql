CREATE TABLE inventory_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  on_hand_qty numeric(14,4) NOT NULL DEFAULT 0,
  in_transit_qty numeric(14,4) NOT NULL DEFAULT 0,
  reserved_qty numeric(14,4) NOT NULL DEFAULT 0,
  reorder_point_qty numeric(14,4) NOT NULL DEFAULT 0,
  safety_stock_qty numeric(14,4) NOT NULL DEFAULT 0,
  unit_cost_cents integer NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD',
  last_counted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, product_id, facility_id)
);

CREATE TABLE inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  transaction_type text NOT NULL CHECK (transaction_type IN ('receipt','issue','adjustment','transfer_in','transfer_out','cycle_count','return')),
  quantity numeric(14,4) NOT NULL,
  before_qty numeric(14,4) NOT NULL,
  after_qty numeric(14,4) NOT NULL,
  reference_type text,
  reference_id uuid,
  unit_cost_cents integer,
  transaction_date date NOT NULL,
  created_by uuid REFERENCES profiles,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_txn_product ON inventory_transactions (tenant_id, product_id, facility_id, transaction_date DESC);

CREATE TABLE inventory_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  facility_id uuid NOT NULL REFERENCES facilities,
  service_level_pct numeric(5,2) NOT NULL DEFAULT 95,
  lead_time_days integer NOT NULL DEFAULT 14,
  holding_cost_pct numeric(5,2) NOT NULL DEFAULT 25,
  ordering_cost_cents integer NOT NULL DEFAULT 50000,
  calculated_safety_stock numeric(14,4),
  calculated_rop numeric(14,4),
  calculated_eoq numeric(14,4),
  is_override boolean NOT NULL DEFAULT false,
  calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, product_id, facility_id)
);

ALTER TABLE inventory_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_inventory_positions" ON inventory_positions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_inventory_transactions" ON inventory_transactions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_inventory_policies" ON inventory_policies USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_inventory_positions_updated_at BEFORE UPDATE ON inventory_positions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_policies_updated_at BEFORE UPDATE ON inventory_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();