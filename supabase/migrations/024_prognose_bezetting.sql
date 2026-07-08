-- ============================================================
-- 024_prognose_bezetting.sql
-- Niveau 2 van de prognose-bezetting: per-week override op het
-- project-brede gemiddelde (bezetting_gemiddeld, migratie 018).
--
-- week_offset (relatief t.o.v. start_datum van het project) i.p.v.
-- een absolute datum — zodat overrides automatisch meeschuiven als
-- het project versleept wordt (start_datum wijzigt), zonder dat er
-- ergens rijen herschreven hoeven te worden.
--
-- Veiligheid:
--   - Puur additief: geen bestaande kolom of tabel wordt gewijzigd
--   - Geen bestaande RLS policies worden aangeraakt
-- ============================================================

-- ─── 1. Tabel prognose_bezetting ──────────────────────────────

create table prognose_bezetting (
  id                      uuid primary key default gen_random_uuid(),
  prognose_project_id     uuid not null references prognose_projecten(id) on delete cascade,
  tenant_id               uuid not null references tenants(id) on delete cascade,

  week_offset             int  not null,  -- 0 = startweek, 1 = week erna, etc.
  aantal_monteurs         int,
  tekst                   text,

  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),

  unique (prognose_project_id, week_offset)
);

-- ─── 2. Index ────────────────────────────────────────────────

create index idx_prognose_bezetting_project
  on prognose_bezetting(tenant_id, prognose_project_id);

-- ─── 3. RLS ──────────────────────────────────────────────────

alter table prognose_bezetting enable row level security;

create policy "prognose_bezetting_select" on prognose_bezetting
  for select using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

create policy "prognose_bezetting_insert" on prognose_bezetting
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

create policy "prognose_bezetting_update" on prognose_bezetting
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  )
  with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

create policy "prognose_bezetting_delete" on prognose_bezetting
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

-- ─── 4. Grant ────────────────────────────────────────────────

grant select, insert, update, delete
  on public.prognose_bezetting
  to authenticated;

-- ─── 5. Audit-logging ────────────────────────────────────────
-- log_wijziging() bestaat al (migratie 016).

create trigger audit_prognose_bezetting
  after insert or update or delete on public.prognose_bezetting
  for each row execute function log_wijziging();

-- ─── Validatie ───────────────────────────────────────────────
-- Voer dit uit na de migratie. Verwachte output:
--   prognose_bezetting rijen:         0  (lege tabel)
--   prognose_bezetting RLS policies:  4
--   audit_prognose_bezetting trigger: 3  (insert, update, delete)

select 'prognose_bezetting rijen' as check,
  count(*) as resultaat
from prognose_bezetting

union all

select 'prognose_bezetting RLS policies',
  count(*)
from pg_policies
where tablename = 'prognose_bezetting'

union all

select 'audit_prognose_bezetting trigger',
  count(*)
from information_schema.triggers
where trigger_name = 'audit_prognose_bezetting';
