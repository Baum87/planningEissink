-- ============================================================
-- 007_profielen.sql
-- Profielen tabel: koppeling auth-gebruiker ↔ app-identiteit.
--
-- Vervangt het fragiele string-systeem (projectleider_initialen)
-- door UUID-gebaseerde relaties. projectleider_initialen blijft
-- staan als legacy veld — projectleider_id is leidend.
--
-- Display-logica overal in de app:
--   toon: profiel.afkorting || profiel.weergave_naam
-- ============================================================

-- ─── Profielen tabel ─────────────────────────────────────────

create table profielen (
  id            uuid primary key references auth.users(id) on delete cascade,
  tenant_id     uuid not null references tenants(id),
  weergave_naam text not null,
  afkorting     text check (char_length(afkorting) <= 4),
  monteur_id    uuid references monteurs(id) on delete set null,
  created_at    timestamptz default now()
);

-- ─── RLS ─────────────────────────────────────────────────────

alter table profielen enable row level security;

-- Alle ingelogde gebruikers van de eigen tenant mogen lezen
-- (nodig voor dropdown in projectformulier en filter in planning)
create policy "profielen_select" on profielen
  for select using (tenant_id = get_user_tenant_id());

-- Alleen admin mag profielen aanmaken, wijzigen en verwijderen
-- (via Edge Function of directe client — RLS bewaakt de grens)
create policy "profielen_insert" on profielen
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'admin'
  );

create policy "profielen_update" on profielen
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'admin'
  );

create policy "profielen_delete" on profielen
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'admin'
  );

-- ─── Grant ───────────────────────────────────────────────────

grant select, insert, update, delete
  on public.profielen
  to authenticated;

-- ─── projectleider_id op projecten ───────────────────────────

alter table projecten
  add column projectleider_id uuid references profielen(id) on delete set null;

-- ─── Validatie ───────────────────────────────────────────────
-- Voer dit uit na de migratie — beide counts moeten 0 zijn.

select 'profielen rijen'                  as check, count(*) from profielen
union all
select 'projecten met projectleider_id',           count(*) from projecten where projectleider_id is not null;
