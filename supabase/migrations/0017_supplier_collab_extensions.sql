alter table profiles add column if not exists attributes jsonb not null default '{}';

alter table planned_orders
  add column if not exists confirmed_qty numeric(14,4),
  add column if not exists confirmed_date date,
  add column if not exists supplier_response_status text not null default 'pending'
    check (supplier_response_status in ('pending','acknowledged','rejected')),
  add column if not exists supplier_response_reason text;

create table if not exists supplier_scorecards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations,
  supplier_id uuid not null references suppliers,
  score_month integer not null check (score_month between 1 and 12),
  score_year integer not null,
  otif_pct numeric(8,4) not null default 0,
  lead_time_adherence_pct numeric(8,4) not null default 0,
  defect_rate_pct numeric(8,4) not null default 0,
  composite_score numeric(8,4) not null default 0,
  grade text not null default 'C',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, supplier_id, score_month, score_year)
);

alter table supplier_scorecards enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='supplier_scorecards' and policyname='tenant_isolation_supplier_scorecards'
  ) then
    create policy "tenant_isolation_supplier_scorecards" on supplier_scorecards
      using (tenant_id = get_tenant_id()) with check (tenant_id = get_tenant_id());
  end if;
end $$;

create trigger trg_supplier_scorecards_updated_at
  before update on supplier_scorecards
  for each row execute function set_updated_at();
