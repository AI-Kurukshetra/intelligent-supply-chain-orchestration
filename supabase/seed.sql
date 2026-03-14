INSERT INTO organizations (id, name, slug, plan, status, settings, trial_ends_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Acme Electronics Manufacturing',
  'acme-electronics',
  'professional',
  'active',
  '{"currency_code":"USD","timezone":"America/Chicago"}',
  now() + interval '30 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO facilities (id, tenant_id, code, name, type, address, country_code, timezone, status)
VALUES
  ('20000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','main_plant','Main Plant','plant','{"city":"Austin","state":"TX"}','US','America/Chicago','active'),
  ('20000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','warehouse_east','Warehouse East','warehouse','{"city":"Atlanta","state":"GA"}','US','America/New_York','active'),
  ('20000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','warehouse_west','Warehouse West','warehouse','{"city":"Reno","state":"NV"}','US','America/Los_Angeles','active')
ON CONFLICT DO NOTHING;

WITH product_seed AS (
  SELECT
    gen_random_uuid() AS id,
    '11111111-1111-1111-1111-111111111111'::uuid AS tenant_id,
    CASE
      WHEN gs <= 20 THEN 'PCB-' || lpad(gs::text, 3, '0')
      WHEN gs <= 35 THEN 'CBL-' || lpad(gs::text, 3, '0')
      ELSE 'ASM-' || lpad(gs::text, 3, '0')
    END AS sku,
    CASE
      WHEN gs <= 20 THEN 'Printed Circuit Board ' || gs
      WHEN gs <= 35 THEN 'Cable Harness ' || gs
      ELSE 'Finished Assembly ' || gs
    END AS name,
    CASE
      WHEN gs <= 20 THEN 'PCBs'
      WHEN gs <= 35 THEN 'Cables'
      ELSE 'Finished Assemblies'
    END AS category,
    (1000 + gs * 250) AS standard_cost_cents,
    CASE WHEN gs <= 35 THEN 'active' ELSE 'new' END AS status
  FROM generate_series(1, 50) AS gs
)
INSERT INTO products (id, tenant_id, sku, name, category, standard_cost_cents, status)
SELECT id, tenant_id, sku, name, category, standard_cost_cents, status FROM product_seed
ON CONFLICT (tenant_id, sku) DO NOTHING;

WITH supplier_seed AS (
  SELECT
    gen_random_uuid() AS id,
    '11111111-1111-1111-1111-111111111111'::uuid AS tenant_id,
    'SUP-' || lpad(gs::text, 3, '0') AS code,
    'Supplier ' || gs AS name,
    (7 + (gs % 5) * 7) AS lead_time_days,
    CASE
      WHEN gs IN (3, 11) THEN 'critical'
      WHEN gs IN (5, 8, 14) THEN 'high'
      WHEN gs % 2 = 0 THEN 'medium'
      ELSE 'low'
    END AS risk_rating,
    'contact' || gs || '@supplier.example' AS contact_email
  FROM generate_series(1, 15) AS gs
)
INSERT INTO suppliers (id, tenant_id, code, name, lead_time_days, risk_rating, contact_email)
SELECT id, tenant_id, code, name, lead_time_days, risk_rating, contact_email FROM supplier_seed
ON CONFLICT (tenant_id, code) DO NOTHING;

WITH finished_goods AS (
  SELECT id, row_number() OVER (ORDER BY sku) AS seq
  FROM products
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND category = 'Finished Assemblies'
  ORDER BY sku
  LIMIT 20
),
components AS (
  SELECT id, sku, row_number() OVER (ORDER BY sku) AS seq
  FROM products
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND category <> 'Finished Assemblies'
),
headers AS (
  INSERT INTO bom_headers (id, tenant_id, product_id, version, status, effective_from)
  SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', fg.id, '1.0', 'active', current_date
  FROM finished_goods fg
  RETURNING id, product_id
)
INSERT INTO bom_lines (tenant_id, bom_header_id, parent_product_id, component_product_id, quantity, uom, position_number)
SELECT
  '11111111-1111-1111-1111-111111111111',
  h.id,
  h.product_id,
  c.id,
  (1 + ((fg.seq + c.seq) % 4))::numeric,
  'EA',
  c.seq
FROM headers h
JOIN finished_goods fg ON fg.id = h.product_id
JOIN components c ON c.seq BETWEEN ((fg.seq - 1) % 10) + 1 AND ((fg.seq - 1) % 10) + 3;

INSERT INTO demand_history (tenant_id, product_id, facility_id, period_start, period_end, actual_qty, source)
SELECT
  '11111111-1111-1111-1111-111111111111',
  p.id,
  f.id,
  week_start::date,
  (week_start + interval '6 day')::date,
  ROUND((80 + p_row * 3 + 25 * sin(week_index / 6.0) + week_index * 0.4 + ((week_index % 5) - 2) * 3)::numeric, 4),
  'erp_sales'
FROM (
  SELECT id, row_number() OVER (ORDER BY sku) AS p_row FROM products WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
) p
CROSS JOIN (
  SELECT id FROM facilities WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
) f
CROSS JOIN LATERAL (
  SELECT
    generate_series(current_date - interval '103 week', current_date, interval '1 week') AS week_start,
    row_number() OVER () AS week_index
) weeks;

INSERT INTO inventory_positions (tenant_id, product_id, facility_id, on_hand_qty, in_transit_qty, reserved_qty, reorder_point_qty, safety_stock_qty, unit_cost_cents, currency_code)
SELECT
  '11111111-1111-1111-1111-111111111111',
  p.id,
  f.id,
  (120 + p_row * 2 + f_row * 10)::numeric,
  (15 + (p_row % 8))::numeric,
  (8 + (f_row % 4))::numeric,
  (40 + p_row)::numeric,
  (25 + p_row / 2.0)::numeric,
  (1200 + p_row * 50),
  'USD'
FROM (
  SELECT id, row_number() OVER (ORDER BY sku) AS p_row FROM products WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
) p
CROSS JOIN (
  SELECT id, row_number() OVER (ORDER BY code) AS f_row FROM facilities WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
) f
ON CONFLICT (tenant_id, product_id, facility_id) DO NOTHING;

INSERT INTO planning_cycles (id, tenant_id, cycle_name, cycle_type, status, horizon_start, horizon_end, created_at, updated_at)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'FY26-WQ Planning Cycle',
  'mrp',
  'open',
  current_date,
  current_date + interval '90 day',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO exceptions (tenant_id, exception_type, severity, status, title, description, entity_type, entity_name, priority_score, ai_recommendation, created_at, updated_at)
SELECT
  '11111111-1111-1111-1111-111111111111',
  exception_type,
  severity,
  'open',
  title,
  description,
  entity_type,
  entity_name,
  priority_score,
  ai_recommendation,
  now(),
  now()
FROM (
  VALUES
    ('supply_shortage','critical','Critical supply shortage on ASM-036','Available inventory will miss next week demand.','product','ASM-036',95,'Expedite open supply and pull ahead substitute stock.'),
    ('late_po','high','Late purchase order for PCB-004','Supplier confirmation slipped by 5 days.','product','PCB-004',88,'Escalate supplier and assess alternate source.'),
    ('capacity_overload','high','Main Plant capacity overload','Line 2 exceeds weekly capacity by 14%.','facility','Main Plant',84,'Shift production to overtime window and rebalance orders.'),
    ('inventory_excess','medium','Excess cable inventory on CBL-021','Weeks of supply exceed policy threshold.','product','CBL-021',62,'Freeze replenishment and evaluate promotion pull-through.'),
    ('forecast_bias','medium','Forecast bias detected for ASM-042','Demand forecast has sustained positive bias.','product','ASM-042',59,'Review override behavior and reset baseline.'),
    ('supplier_risk','high','Critical supplier risk escalation','Supplier 3 has moved to critical risk.','supplier','Supplier 3',81,'Prepare contingency sourcing plan.'),
    ('stockout_risk','critical','Stockout risk at Warehouse East','Inventory coverage below safety stock.','facility','Warehouse East',93,'Reallocate stock from Warehouse West.'),
    ('mrp_exception','medium','MRP net requirements spike on PCB-013','Net requirements doubled week over week.','product','PCB-013',66,'Validate demand signal and supplier capacity.'),
    ('shipment_delay','high','Inbound shipment delay','Expected inbound transfer delayed by weather.','facility','Warehouse West',77,'Prioritize affected customer orders.'),
    ('cycle_count_variance','low','Cycle count variance detected','Recent count variance exceeded tolerance.','product','CBL-009',41,'Schedule recount and investigate transaction history.')
) AS e(exception_type, severity, title, description, entity_type, entity_name, priority_score, ai_recommendation);

INSERT INTO sop_cycles (id, tenant_id, cycle_name, cycle_month, cycle_year, status, step_due_dates, created_at, updated_at)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'April 2026 S&OP',
  4,
  2026,
  'supply_review',
  '{"demand_review":"2026-04-05","supply_review":"2026-04-10","executive_review":"2026-04-15"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;