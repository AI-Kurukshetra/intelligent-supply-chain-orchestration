create table if not exists connector_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations,
  connector_id uuid not null references connectors on delete cascade,
  object_type text not null,
  source_field text not null,
  target_field text not null,
  transform_type text not null check (transform_type in ('direct','lookup','formula','constant','conditional')),
  transform_config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations,
  connector_id uuid not null references connectors on delete cascade,
  object_type text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  records_processed integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations,
  webhook_subscription_id uuid not null references webhook_subscriptions on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  response_status integer,
  response_body text,
  attempt_count integer not null default 0,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table connector_mappings enable row level security;
alter table sync_jobs enable row level security;
alter table webhook_deliveries enable row level security;

drop policy if exists connector_mappings_tenant on connector_mappings;
create policy connector_mappings_tenant on connector_mappings for all using (tenant_id = get_tenant_id());
drop policy if exists sync_jobs_tenant on sync_jobs;
create policy sync_jobs_tenant on sync_jobs for all using (tenant_id = get_tenant_id());
drop policy if exists webhook_deliveries_tenant on webhook_deliveries;
create policy webhook_deliveries_tenant on webhook_deliveries for all using (tenant_id = get_tenant_id());

drop trigger if exists trg_connector_mappings_updated_at on connector_mappings;
create trigger trg_connector_mappings_updated_at before update on connector_mappings for each row execute function set_updated_at();
drop trigger if exists trg_sync_jobs_updated_at on sync_jobs;
create trigger trg_sync_jobs_updated_at before update on sync_jobs for each row execute function set_updated_at();
drop trigger if exists trg_webhook_deliveries_updated_at on webhook_deliveries;
create trigger trg_webhook_deliveries_updated_at before update on webhook_deliveries for each row execute function set_updated_at();
