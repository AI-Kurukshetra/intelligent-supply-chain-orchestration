CREATE TABLE job_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  job_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','running','completed','completed_with_errors','failed')),
  result jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE job_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_job_results" ON job_results
  USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_job_results_updated_at
  BEFORE UPDATE ON job_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();
