-- ============================================================
-- 005_rename_roles.sql
-- Hernoem rollen naar tenant-agnostische namen:
--   beheerder  → admin
--   projectleider → gebruiker
-- Voeg monteur toe als read-only rol (toekomstige monteur-login).
-- ============================================================

-- ─── Policies bijwerken ─────────────────────────────────────

-- tenant_instellingen
drop policy if exists "tenant_instellingen_update" on tenant_instellingen;
create policy "tenant_instellingen_update" on tenant_instellingen
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'admin'
  );

-- projecten
drop policy if exists "projecten_insert" on projecten;
drop policy if exists "projecten_update" on projecten;
drop policy if exists "projecten_delete" on projecten;
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

-- monteurs
drop policy if exists "monteurs_insert" on monteurs;
drop policy if exists "monteurs_update" on monteurs;
drop policy if exists "monteurs_delete" on monteurs;
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

-- groepen
drop policy if exists "groepen_write" on groepen;
create policy "groepen_write" on groepen
  for all using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- groep_leden
drop policy if exists "groep_leden_write" on groep_leden;
create policy "groep_leden_write" on groep_leden
  for all using (
    exists (
      select 1 from groepen g
      where g.id = groep_id
      and g.tenant_id = get_user_tenant_id()
    )
    and get_user_rol() in ('admin', 'planner')
  );

-- toewijzingen
drop policy if exists "toewijzingen_insert" on toewijzingen;
drop policy if exists "toewijzingen_delete" on toewijzingen;
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

-- periodes
drop policy if exists "periodes_write" on periodes;
create policy "periodes_write" on periodes
  for all using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );

-- tenant_expertises
drop policy if exists "expertises_insert" on tenant_expertises;
drop policy if exists "expertises_update" on tenant_expertises;
drop policy if exists "expertises_delete" on tenant_expertises;
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

-- audit_log
drop policy if exists "audit_log_select" on audit_log;
create policy "audit_log_select" on audit_log
  for select using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() = 'admin'
  );

-- ─── Bestaande gebruikers bijwerken ─────────────────────────
update auth.users
set raw_app_meta_data = jsonb_set(raw_app_meta_data, '{rol}', '"admin"')
where raw_app_meta_data->>'rol' = 'beheerder';

update auth.users
set raw_app_meta_data = jsonb_set(raw_app_meta_data, '{rol}', '"gebruiker"')
where raw_app_meta_data->>'rol' = 'projectleider';
