-- ============================================================
-- 006_grants.sql
-- Expliciete GRANTs vereist vanaf Supabase wijziging 30 mei 2026.
-- Zonder deze grants geeft PostgREST een 42501-fout op nieuwe projecten.
-- RLS-policies (002) blijven de inhoudelijke beveiliging — dit is de
-- toegangslaag daarvoor.
-- ============================================================

-- anon krijgt nergens toegang: de app vereist altijd een login.

-- tenants: lezen (RLS beperkt tot eigen tenant)
grant select
  on public.tenants
  to authenticated;

-- tenant_instellingen: lezen + aanpassen (RLS beperkt tot eigen tenant + admin)
grant select, update
  on public.tenant_instellingen
  to authenticated;

-- tenant_expertises: volledig (RLS beperkt schrijven tot admin/planner)
grant select, insert, update, delete
  on public.tenant_expertises
  to authenticated;

-- projecten
grant select, insert, update, delete
  on public.projecten
  to authenticated;

-- monteurs
grant select, insert, update, delete
  on public.monteurs
  to authenticated;

-- groepen
grant select, insert, update, delete
  on public.groepen
  to authenticated;

-- groep_leden
grant select, insert, update, delete
  on public.groep_leden
  to authenticated;

-- toewijzingen
grant select, insert, update, delete
  on public.toewijzingen
  to authenticated;

-- periodes
grant select, insert, update, delete
  on public.periodes
  to authenticated;

-- audit_log: lezen (alleen admin via RLS) + inserten voor logging
grant select, insert
  on public.audit_log
  to authenticated;
