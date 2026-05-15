-- ============================================================
-- RLS Smoke Test
-- Handmatig uitvoeren in Supabase SQL-editor
-- Één stap per keer, per rol inloggen in de app
-- ============================================================

-- STAP 1: Anonieme gebruiker
-- Uitvoeren zonder actieve sessie (of als anon role)
-- Verwacht: alle tellingen = 0

select 'toewijzingen' as tabel, count(*) as rijen from toewijzingen
union all
select 'projecten',   count(*) from projecten
union all
select 'monteurs',    count(*) from monteurs
union all
select 'profielen',   count(*) from profielen
union all
select 'audit_log',   count(*) from audit_log;

-- STAP 2: Planner (inloggen als Roy)
-- Verwacht: rijen van eigen tenant zichtbaar

-- 2a. Basisquery — verwacht: > 0 rijen
select count(*) from toewijzingen;

-- 2b. UPDATE slaagt — verwacht: 1 row updated
-- Vervang [id] door een geldig toewijzing-id
-- update toewijzingen
--   set datum_tot = datum_tot
--   where id = '[id]';

-- 2c. UPDATE mag tenant_id NIET wijzigen — verwacht: error
-- Dit test de with_check clausule
-- update toewijzingen
--   set tenant_id = '00000000-0000-0000-0000-000000000000'
--   where id = '[id]';

-- STAP 3: Gebruiker (inloggen als Martijn)
-- Verwacht: lezen slaagt, schrijven mislukt

-- 3a. Lezen — verwacht: rijen zichtbaar
select count(*) from toewijzingen;
select count(*) from projecten;
select count(*) from monteurs;

-- 3b. Schrijven — verwacht: error (insufficient privilege)
-- insert into toewijzingen (tenant_id, monteur_id, project_id, datum_van, datum_tot)
--   values (get_user_tenant_id(), '[monteur_id]', '[project_id]', now(), now());

-- STAP 4: Cross-tenant isolatie (kritisch voor commercieel gebruik)
-- Inloggen als Eissink-gebruiker
-- Verwacht: exact één tenant_id in resultaat

select distinct tenant_id from toewijzingen;
select distinct tenant_id from projecten;
select distinct tenant_id from monteurs;

-- ============================================================
-- Checklijst na elke migratie
-- ============================================================
-- [ ] Stap 1 uitgevoerd: anoniem geblokkeerd
-- [ ] Stap 2a: planner ziet data
-- [ ] Stap 2b: UPDATE slaagt
-- [ ] Stap 2c: tenant_id wijzigen geblokkeerd
-- [ ] Stap 3a: gebruiker ziet data
-- [ ] Stap 3b: gebruiker kan niet schrijven
-- [ ] Stap 4: alleen eigen tenant_id zichtbaar
