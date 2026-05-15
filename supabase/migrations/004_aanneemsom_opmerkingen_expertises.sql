-- ============================================================
-- 004_aanneemsom_opmerkingen_expertises.sql
-- ============================================================

-- 1. Aanneemsom verwijderen uit projecten
alter table projecten drop column if exists aanneemsom;

-- 2. Opmerkingen toevoegen aan projecten
alter table projecten add column if not exists opmerkingen text;

-- 3. Veld labels kolom toevoegen aan tenant_instellingen
alter table tenant_instellingen
  add column if not exists veld_labels jsonb default '{}';

-- 4. kolommen_config bijwerken: aanneemsom eruit, opmerkingen erin
update tenant_instellingen
set kolommen_config = jsonb_set(
  kolommen_config #- '{projecten,aanneemsom}',
  '{projecten,opmerkingen}',
  'true'
);

-- 5. Tenant expertises tabel
create table if not exists tenant_expertises (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  naam       text not null,
  volgorde   int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_tenant_expertises_tenant_id
  on tenant_expertises(tenant_id);

-- 6. RLS voor tenant_expertises
alter table tenant_expertises enable row level security;

create policy "expertises_select" on tenant_expertises
  for select using (tenant_id = get_user_tenant_id());

create policy "expertises_insert" on tenant_expertises
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

create policy "expertises_update" on tenant_expertises
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

create policy "expertises_delete" on tenant_expertises
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('beheerder', 'planner')
  );

-- 7. Demo tenant expertises
insert into tenant_expertises (tenant_id, naam, volgorde) values
  ('b0000000-0000-0000-0000-000000000002', 'Plafonds',     1),
  ('b0000000-0000-0000-0000-000000000002', 'Wanden',       2),
  ('b0000000-0000-0000-0000-000000000002', 'Systeemwanden',3),
  ('b0000000-0000-0000-0000-000000000002', 'Afsmeren',     4),
  ('b0000000-0000-0000-0000-000000000002', 'Overig',       5);
