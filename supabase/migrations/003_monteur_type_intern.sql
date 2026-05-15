-- ============================================================
-- 003_monteur_type_intern.sql
-- Hernoem monteur type 'Eissink' → 'Intern' zodat de classificatie
-- tenant-agnostisch is.
-- ============================================================

-- 1. Drop constraint eerst (anders blokkeert hij de update)
alter table monteurs drop constraint monteurs_type_check;

-- 2. Migreer bestaande data
update monteurs set type = 'Intern' where type = 'Eissink';

-- 3. Voeg nieuwe constraint toe
alter table monteurs add constraint monteurs_type_check
  check (type in ('Intern', 'Onderaannemer'));
