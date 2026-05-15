-- ============================================================
-- 009_rls_update_with_check.sql
-- UPDATE policy op toewijzingen: with_check toegevoegd.
--
-- using()      → welke rijen mogen worden bijgewerkt
-- with_check() → hoe de rij er ná de update uit mag zien
--               voorkomt dat een update tenant_id of andere
--               kritische velden stiekem wijzigt
-- ============================================================

drop policy if exists "toewijzingen_update" on toewijzingen;

create policy "toewijzingen_update"
on toewijzingen for update
using (
  (tenant_id = get_user_tenant_id()) and
  (get_user_rol() = any(array['admin'::text, 'planner'::text]))
)
with check (
  (tenant_id = get_user_tenant_id()) and
  (get_user_rol() = any(array['admin'::text, 'planner'::text]))
);
