-- ============================================================
-- 013_datum_check_constraints.sql
-- Voorkomt dat datum_tot vóór datum_van ligt in toewijzingen
-- en periodes. De DB wees dit eerder niet af.
-- ============================================================

alter table toewijzingen
  add constraint toewijzingen_datum_volgorde
  check (datum_tot >= datum_van);

alter table periodes
  add constraint periodes_datum_volgorde
  check (datum_tot >= datum_van);

-- ─── Validatie ────────────────────────────────────────────────
-- Beide queries moeten 0 teruggeven vóórdat je de migratie uitvoert.
-- Als er bestaande ongeldige rijen zijn, faalt de migratie — fix eerst.

select count(*) as ongeldige_toewijzingen
from toewijzingen
where datum_tot < datum_van;

select count(*) as ongeldige_periodes
from periodes
where datum_tot < datum_van;
