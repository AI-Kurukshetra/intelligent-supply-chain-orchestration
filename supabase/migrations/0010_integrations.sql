CREATE TABLE connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  connector_type text NOT NULL CHECK (connector_type IN ('sap_s4hana','oracle_erp','dynamics_365','generic_rest','csv_upload')),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','error')),
  config_encrypted jsonb NOT NULL DEFAULT '{}',
  sync_schedule_cron text,
  last_sync_at timestamptz,
  last_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES organizations,
  name text NOT NULL,
  target_url text NOT NULL,
  event_types text[] NOT NULL DEFAULT '{}',
  secret_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_connectors" ON connectors USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
CREATE POLICY "tenant_isolation_webhook_subscriptions" ON webhook_subscriptions USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

CREATE TRIGGER trg_connectors_updated_at BEFORE UPDATE ON connectors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_webhook_subscriptions_updated_at BEFORE UPDATE ON webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();