-- ============================================================
-- 008_bugfixes_rls.sql
-- Ontbrekende UPDATE-policy op toewijzingen.
-- ============================================================

create policy "toewijzingen_update" on toewijzingen
  for update using (
    tenant_id = get_user_tenant_id()
    and get_user_rol() in ('admin', 'planner')
  );
