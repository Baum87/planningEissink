-- ============================================================
-- 018_prognose_projecten.sql
-- Prognose-tijdlijn voor management: rolling-window overzicht
-- van de volledige orderportefeuille, los van de operationele
-- planning (projecten/toewijzingen).
--
-- Wat verandert:
--   1. tenant_instellingen krijgt kolom prognose_config (JSONB)
--      voor per-tenant instellingen van de prognose-tijdlijn.
--   2. Nieuwe tabel prognose_projecten met eigen RLS.
--      Alleen 'admin' en 'management' hebben toegang.
--      Bestaande policies worden NIET gewijzigd.
--
-- Veiligheid:
--   - Puur additief: geen bestaande kolom of tabel wordt gewijzigd
--   - Geen bestaande RLS policies worden aangeraakt
--   - ALTER TABLE ADD COLUMN met DEFAULT is in PostgreSQL instant
--     (geen table rewrite, geen lock op bestaande rijen)
--
-- Toekomstige uitbreiding (nog NIET bouwen):
--   prognose_bezetting (id, prognose_project_id, week_offset, aantal_monteurs)
--   voor per-week bezettingsschema. bezetting_gemiddeld op deze tabel
--   blijft als ruwe schatting naast die subtabel bestaan.
-- ============================================================

-- ─── 1. prognose_config op tenant_instellingen ───────────────
-- Aparte kolom (niet in modules_config) omdat het strings bevat,
-- niet alleen booleans.
-- Voorbeeld waarde: { "groepering_veld": "projectleider_id" }

alter table tenant_instellingen
  add column prognose_config jsonb not null default '{}';

-- ─── 2. Tabel prognose_projecten ─────────────────────────────

create table prognose_projecten (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,

  -- Projectgegevens (ingevuld door management)
  omschrijving            text not null,
  projectnummer           text,
  opdrachtgever           text,
  projectleider_id        uuid references profielen(id) on delete set null,

  -- Status
  status                  text not null default 'in_opdracht'
                            check (status in ('potentieel', 'in_opdracht')),
  status_gewijzigd_op     timestamptz,

  -- Financieel
  aanneemsom              numeric(12, 2),

  -- Tijdlijn (start_datum altijd een maandag — bewaakt door de frontend)
  start_datum             date not null,
  duur_weken              int  not null check (duur_weken > 0),

  -- Bezetting (v1: niet invoerbaar via UI, klaar voor toekomstige
  -- subtabel prognose_bezetting per week)
  bezetting_gemiddeld     numeric(5, 1),

  -- Weergave
  kleur                   varchar(7),

  -- Koppeling aan operationeel project (gezet via Edge Function
  -- bij statusovergang naar in_opdracht)
  operationeel_project_id uuid references projecten(id) on delete set null,

  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ─── 3. Index ────────────────────────────────────────────────

create index idx_prognose_tenant_datum
  on prognose_projecten(tenant_id, start_datum);

-- ─── 4. RLS ──────────────────────────────────────────────────

alter table prognose_projecten enable row level security;

-- Lezen: admin en management van eigen tenant
create policy "prognose_select" on prognose_projecten
  for select using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

-- Aanmaken: admin en management van eigen tenant
create policy "prognose_insert" on prognose_projecten
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

-- Wijzigen: admin en management van eigen tenant
create policy "prognose_update" on prognose_projecten
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  )
  with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

-- Verwijderen: admin en management van eigen tenant
create policy "prognose_delete" on prognose_projecten
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'management')
  );

-- ─── 5. Grant ────────────────────────────────────────────────

grant select, insert, update, delete
  on public.prognose_projecten
  to authenticated;

-- ─── Validatie ───────────────────────────────────────────────
-- Voer dit uit na de migratie. Verwachte output:
--   prognose_config kolom aanwezig: 1
--   prognose_projecten rijen:       0  (lege tabel)
--   prognose RLS policies:          4

select 'prognose_config kolom aanwezig' as check,
  count(*) as resultaat
from information_schema.columns
where table_name = 'tenant_instellingen'
  and column_name = 'prognose_config'

union all

select 'prognose_projecten rijen',
  count(*)
from prognose_projecten

union all

select 'prognose RLS policies',
  count(*)
from pg_policies
where tablename = 'prognose_projecten';
