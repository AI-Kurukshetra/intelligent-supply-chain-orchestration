CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES organizations,
  user_id uuid REFERENCES profiles,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL CHECK (action IN ('create','update','delete','login','export')),
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_entity ON audit_log (tenant_id, entity_type, entity_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_tenant" ON audit_log FOR SELECT USING (tenant_id = get_tenant_id());

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE TRIGGER trg_prevent_audit_log_update BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
CREATE TRIGGER trg_prevent_audit_log_delete BEFORE DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();