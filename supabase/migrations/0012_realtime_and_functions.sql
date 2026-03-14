ALTER PUBLICATION supabase_realtime ADD TABLE exceptions;
ALTER PUBLICATION supabase_realtime ADD TABLE kpi_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE planning_cells;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_actions;

CREATE OR REPLACE FUNCTION explode_bom(
  p_tenant_id uuid,
  p_product_id uuid,
  p_quantity numeric DEFAULT 1,
  p_max_depth integer DEFAULT 15
)
RETURNS TABLE (
  level integer,
  parent_product_id uuid,
  component_product_id uuid,
  component_sku text,
  component_name text,
  required_qty numeric,
  uom text
) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE bom_tree AS (
    SELECT
      1 AS level,
      bl.parent_product_id,
      bl.component_product_id,
      p.sku AS component_sku,
      p.name AS component_name,
      bl.quantity * p_quantity AS required_qty,
      bl.uom
    FROM bom_lines bl
    JOIN bom_headers bh ON bl.bom_header_id = bh.id
    JOIN products p ON bl.component_product_id = p.id
    WHERE bh.tenant_id = p_tenant_id
      AND bh.product_id = p_product_id
      AND bh.status = 'active'
      AND bl.tenant_id = p_tenant_id
    UNION ALL
    SELECT
      bt.level + 1,
      bl2.parent_product_id,
      bl2.component_product_id,
      p2.sku,
      p2.name,
      bl2.quantity * bt.required_qty,
      bl2.uom
    FROM bom_lines bl2
    JOIN bom_headers bh2 ON bl2.bom_header_id = bh2.id
    JOIN products p2 ON bl2.component_product_id = p2.id
    JOIN bom_tree bt ON bl2.parent_product_id = bt.component_product_id
    WHERE bh2.tenant_id = p_tenant_id
      AND bh2.status = 'active'
      AND bt.level < p_max_depth
  )
  SELECT * FROM bom_tree ORDER BY level, component_sku;
$$;

CREATE OR REPLACE FUNCTION calculate_net_requirements(
  p_tenant_id uuid,
  p_product_id uuid,
  p_facility_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT GREATEST(0,
    COALESCE((
      SELECT SUM(forecast_qty) FROM statistical_forecasts
      WHERE tenant_id = p_tenant_id AND product_id = p_product_id
        AND facility_id = p_facility_id
        AND period_start >= p_period_start AND period_end <= p_period_end
    ), 0)
    - COALESCE((
      SELECT on_hand_qty - reserved_qty FROM inventory_positions
      WHERE tenant_id = p_tenant_id AND product_id = p_product_id
        AND facility_id = p_facility_id
    ), 0)
    - COALESCE((
      SELECT SUM(confirmed_qty) FROM open_supply_orders
      WHERE tenant_id = p_tenant_id AND product_id = p_product_id
        AND facility_id = p_facility_id
        AND expected_date <= p_period_end AND status = 'open'
    ), 0)
  );
$$;