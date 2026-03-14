CREATE TABLE planning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  planning_cycle_id uuid NOT NULL REFERENCES planning_cycles,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked','archived')),
  description text,
  owner_id uuid REFERENCES profiles,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE planning_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  session_id uuid NOT NULL REFERENCES planning_sessions,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  period_start date NOT NULL,
  field_name text NOT NULL,
  current_value jsonb,
  original_value jsonb,
  locked_by uuid REFERENCES profiles,
  locked_at timestamptz,
  last_modified_by uuid REFERENCES profiles,
  last_modified_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  UNIQUE (session_id, entity_id, period_start, field_name)
);

CREATE TABLE scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  planning_cycle_id uuid NOT NULL REFERENCES planning_cycles,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived','promoted')),
  branched_from_id uuid REFERENCES scenarios,
  promoted_by uuid REFERENCES profiles,
  promoted_at timestamptz,
  created_by uuid REFERENCES profiles,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scenario_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  scenario_id uuid NOT NULL REFERENCES scenarios ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  period_start date NOT NULL,
  field_name text NOT NULL,
  override_value jsonb NOT NULL,
  original_value jsonb,
  created_by uuid REFERENCES profiles,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_planning_sessions" ON planning_sessions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_planning_cells" ON planning_cells USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_scenarios" ON scenarios USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_scenario_overrides" ON scenario_overrides USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_planning_sessions_updated_at BEFORE UPDATE ON planning_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_scenarios_updated_at BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION set_updated_at();