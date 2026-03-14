create table if not exists report_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations,
  report_definition_id uuid not null references report_definitions on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  file_path text,
  output_format text not null default 'excel' check (output_format in ('pdf','excel')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations,
  report_definition_id uuid not null references report_definitions on delete cascade,
  cron_expression text not null,
  next_run_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table planned_orders add column if not exists actual_delivery_date date;
alter table planned_orders add column if not exists closed_at timestamptz;
alter table planned_orders add column if not exists promised_lead_time_days integer;

alter table report_runs enable row level security;
alter table scheduled_reports enable row level security;

drop policy if exists report_runs_tenant on report_runs;
create policy report_runs_tenant on report_runs
  for select using (tenant_id = get_tenant_id());

drop policy if exists scheduled_reports_tenant on scheduled_reports;
create policy scheduled_reports_tenant on scheduled_reports
  for all using (tenant_id = get_tenant_id());

create index if not exists idx_report_runs_definition on report_runs (tenant_id, report_definition_id, created_at desc);
create index if not exists idx_scheduled_reports_due on scheduled_reports (tenant_id, next_run_at) where is_active = true;

drop trigger if exists trg_report_runs_updated_at on report_runs;
create trigger trg_report_runs_updated_at
  before update on report_runs for each row execute function set_updated_at();

drop trigger if exists trg_scheduled_reports_updated_at on scheduled_reports;
create trigger trg_scheduled_reports_updated_at
  before update on scheduled_reports for each row execute function set_updated_at();
