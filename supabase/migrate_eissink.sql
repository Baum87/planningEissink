-- ============================================================
-- migrate_eissink.sql
-- Eenmalig uitvoeren NADAT Eissink-data is geïmporteerd
-- via CSV export uit het oude project (qrnsjldoeobipqclpdxu).
--
-- Volgorde:
--   1. Importeer CSV's via Table Editor (projecten, monteurs,
--      groepen, groep_leden, toewijzingen, periodes)
--   2. Voer dit script uit
--   3. Controleer de check-query onderaan (alle counts = 0)
-- ============================================================

update projecten
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update monteurs
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update groepen
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update toewijzingen
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

update periodes
set tenant_id = 'a0000000-0000-0000-0000-000000000001'
where tenant_id is null;

-- ─── Validatie: alle counts moeten 0 zijn ───────────────────

select 'projecten zonder tenant_id'   as check, count(*) from projecten   where tenant_id is null
union all
select 'monteurs zonder tenant_id',            count(*) from monteurs    where tenant_id is null
union all
select 'groepen zonder tenant_id',             count(*) from groepen     where tenant_id is null
union all
select 'toewijzingen zonder tenant_id',        count(*) from toewijzingen where tenant_id is null
union all
select 'periodes zonder tenant_id',            count(*) from periodes    where tenant_id is null;
