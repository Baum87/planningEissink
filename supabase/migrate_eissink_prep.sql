-- ============================================================
-- migrate_eissink_prep.sql
-- Uitvoeren in planning_app SQL Editor VÓÓR de CSV-import.
--
-- Verwijdert tijdelijk de NOT NULL constraint op tenant_id
-- zodat de CSV-import (zonder tenant_id kolom) niet blokkeert.
-- migrate_eissink.sql herstelt dit daarna automatisch.
-- ============================================================

-- NOT NULL tijdelijk verwijderen (CSV heeft geen tenant_id kolom)
alter table projecten    alter column tenant_id drop not null;
alter table monteurs     alter column tenant_id drop not null;
alter table groepen      alter column tenant_id drop not null;
alter table toewijzingen alter column tenant_id drop not null;
alter table periodes     alter column tenant_id drop not null;

-- Type check tijdelijk verwijderen (oude data heeft type 'Eissink', migrate_eissink.sql zet dit om naar 'Intern')
alter table monteurs drop constraint if exists monteurs_type_check;
