-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security voor alle tabellen.
-- Uitvoeren in: nieuw Supabase project → SQL Editor (na 001)
-- ============================================================

-- ─── Helper functies ────────────────────────────────────────

create or replace function get_user_rol()
returns text as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'rol',
    'geen'
  );
$$ language sql stable security definer;

create or replace function get_user_tenant_id()
returns uuid as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$ language sql stable security definer;

-- ─── Tenants ────────────────────────────────────────────────

alter table tenants enable row level security;
create policy "tenants_select" on tenants
  for select using (id = get_user_tenant_id());

-- ─── Tenant instellingen ────────────────────────────────────

alter table tenant_instellingen enable row level security;
create policy "tenant_instellingen_select" on tenant_instellingen
  for select using (tenant_id = get_user_tenant_id());
create policy "tenant_instellingen_update" on tenant_instellingen
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'admin'
  );

-- ─── Projecten ──────────────────────────────────────────────

alter table projecten enable row level security;
create policy "projecten_select" on projecten
  for select using (tenant_id = get_user_tenant_id());
create policy "projecten_insert" on projecten
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
create policy "projecten_update" on projecten
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
create policy "projecten_delete" on projecten
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- ─── Monteurs ───────────────────────────────────────────────

alter table monteurs enable row level security;
create policy "monteurs_select" on monteurs
  for select using (tenant_id = get_user_tenant_id());
create policy "monteurs_insert" on monteurs
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
create policy "monteurs_update" on monteurs
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
create policy "monteurs_delete" on monteurs
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- ─── Groepen ────────────────────────────────────────────────

alter table groepen enable row level security;
create policy "groepen_select" on groepen
  for select using (tenant_id = get_user_tenant_id());
create policy "groepen_write" on groepen
  for all using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- ─── Groep_leden ────────────────────────────────────────────

alter table groep_leden enable row level security;
create policy "groep_leden_select" on groep_leden
  for select using (
    exists (
      select 1 from groepen g
      where g.id = groep_id
      and g.tenant_id = get_user_tenant_id()
    )
  );
create policy "groep_leden_write" on groep_leden
  for all using (
    exists (
      select 1 from groepen g
      where g.id = groep_id
      and g.tenant_id = get_user_tenant_id()
    )
    and get_user_rol() in ('admin', 'planner')
  );

-- ─── Toewijzingen ───────────────────────────────────────────

alter table toewijzingen enable row level security;
create policy "toewijzingen_select" on toewijzingen
  for select using (tenant_id = get_user_tenant_id());
create policy "toewijzingen_insert" on toewijzingen
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
create policy "toewijzingen_delete" on toewijzingen
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- ─── Periodes ───────────────────────────────────────────────

alter table periodes enable row level security;
create policy "periodes_select" on periodes
  for select using (tenant_id = get_user_tenant_id());
create policy "periodes_write" on periodes
  for all using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- ─── Tenant expertises ──────────────────────────────────────

alter table tenant_expertises enable row level security;
create policy "expertises_select" on tenant_expertises
  for select using (tenant_id = get_user_tenant_id());
create policy "expertises_insert" on tenant_expertises
  for insert with check (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
create policy "expertises_update" on tenant_expertises
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
create policy "expertises_delete" on tenant_expertises
  for delete using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- ─── Audit log ──────────────────────────────────────────────

alter table audit_log enable row level security;
create policy "audit_log_select" on audit_log
  for select using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'admin'
  );
create policy "audit_log_insert" on audit_log
  for insert with check (tenant_id = get_user_tenant_id());
