-- ============================================================
-- 012_koppel_projectleider_id.sql
-- Vult projecten.projectleider_id in op basis van
-- projectleider_initialen → profielen.afkorting (zelfde tenant).
--
-- Vereiste: profielen voor alle PLs zijn aangemaakt via Beheer UI
-- (stap 1 en 2 van TODO "Projectleiders aanmaken + data migratie").
--
-- Na uitvoeren: validatie query toont gekoppelde en ongekoppelde projecten.
-- Ongekoppelde projecten hebben een afkorting zonder bijbehorend profiel.
-- ============================================================

update projecten p
set    projectleider_id = pr.id
from   profielen pr
where  pr.tenant_id  = p.tenant_id
  and  pr.afkorting  = p.projectleider_initialen
  and  p.projectleider_initialen is not null
  and  p.projectleider_id is null;

-- ─── Validatie ────────────────────────────────────────────────
-- Verwacht: gekoppeld = aantal projecten met bekende PL-initialen
--           ongekoppeld = 0 (als alle 8 profielen aangemaakt zijn)
select
  count(*) filter (where projectleider_id is not null)                          as gekoppeld,
  count(*) filter (where projectleider_initialen is not null
                     and projectleider_id is null)                              as ongekoppeld,
  array_agg(distinct projectleider_initialen)
    filter (where projectleider_initialen is not null
              and projectleider_id is null)                                     as ontbrekende_initialen
from projecten;
