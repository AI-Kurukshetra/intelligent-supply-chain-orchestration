alter table exceptions
  add column if not exists description text,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists entity_name text,
  add column if not exists facility_id uuid references facilities,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references profiles,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references profiles,
  add column if not exists resolution_notes text,
  add column if not exists resolution_action text,
  add column if not exists priority_score integer not null default 50,
  add column if not exists ai_recommendation text,
  add column if not exists suppressed_until timestamptz,
  add column if not exists context_json jsonb not null default '{}',
  add column if not exists last_alert_sent_at timestamptz;

create table if not exists exception_alert_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations,
  exception_id uuid not null references exceptions on delete cascade,
  alert_type text not null default 'email',
  sent_at timestamptz not null default now()
);

alter table exception_alert_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'exception_alert_log' and policyname = 'exception_alert_log_tenant'
  ) then
    create policy "exception_alert_log_tenant" on exception_alert_log
      for select using (tenant_id = get_tenant_id());
  end if;
end $$;

create index if not exists idx_exception_alert_log_exception on exception_alert_log (tenant_id, exception_id, sent_at desc);
create index if not exists idx_exceptions_priority_status on exceptions (tenant_id, status, priority_score desc);
