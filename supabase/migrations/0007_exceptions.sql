CREATE TABLE exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  exception_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','in_progress','resolved','suppressed')),
  title text NOT NULL,
  description text,
  entity_type text,
  entity_id uuid,
  entity_name text,
  facility_id uuid REFERENCES facilities,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES profiles,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles,
  resolution_notes text,
  priority_score integer NOT NULL DEFAULT 50,
  ai_recommendation text,
  suppressed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_exceptions_queue ON exceptions (tenant_id, status, priority_score DESC) WHERE status != 'resolved';

CREATE TABLE exception_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  exception_id uuid NOT NULL REFERENCES exceptions ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_exceptions" ON exceptions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_exception_comments" ON exception_comments USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_exceptions_updated_at BEFORE UPDATE ON exceptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();