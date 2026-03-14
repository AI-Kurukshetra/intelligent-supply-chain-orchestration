CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  uom text NOT NULL DEFAULT 'EA',
  weight_kg numeric(10,4),
  lead_time_days integer NOT NULL DEFAULT 0,
  safety_stock_days integer NOT NULL DEFAULT 7,
  min_order_qty numeric(14,4) NOT NULL DEFAULT 1,
  standard_cost_cents integer NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','discontinued','new')),
  attributes jsonb NOT NULL DEFAULT '{}',
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', sku || ' ' || name || ' ' || coalesce(description,''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, sku)
);
CREATE INDEX idx_products_search ON products USING GIN (search_vector);
CREATE INDEX idx_products_tenant ON products (tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  code text NOT NULL,
  name text NOT NULL,
  country_code text,
  currency_code text NOT NULL DEFAULT 'USD',
  payment_terms_days integer NOT NULL DEFAULT 30,
  lead_time_days integer NOT NULL DEFAULT 14,
  min_order_value_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  risk_rating text NOT NULL DEFAULT 'low' CHECK (risk_rating IN ('low','medium','high','critical')),
  contact_email text,
  attributes jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, code)
);

CREATE TABLE facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('plant','warehouse','distribution_center','cross_dock')),
  address jsonb NOT NULL DEFAULT '{}',
  country_code text,
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'active',
  attributes jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE bom_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  product_id uuid NOT NULL REFERENCES products,
  version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','superseded')),
  effective_from date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  bom_header_id uuid NOT NULL REFERENCES bom_headers ON DELETE CASCADE,
  parent_product_id uuid NOT NULL REFERENCES products,
  component_product_id uuid NOT NULL REFERENCES products,
  quantity numeric(14,6) NOT NULL,
  uom text NOT NULL DEFAULT 'EA',
  scrap_factor_pct numeric(5,2) NOT NULL DEFAULT 0,
  is_phantom boolean NOT NULL DEFAULT false,
  position_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_products" ON products USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_suppliers" ON suppliers USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_facilities" ON facilities USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_bom_headers" ON bom_headers USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_bom_lines" ON bom_lines USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bom_headers_updated_at BEFORE UPDATE ON bom_headers FOR EACH ROW EXECUTE FUNCTION set_updated_at();