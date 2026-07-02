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

-- STAP 5: Prognose RLS (migratie 018)
-- Beleid: alleen admin en management mogen prognose_projecten lezen en schrijven

-- 5a. Inloggen als PLANNER
-- Verwacht: 0 rijen (RLS blokkeert SELECT voor planner)
select count(*) from prognose_projecten;

-- 5b. Inloggen als MANAGEMENT
-- Verwacht: > 0 rijen zichtbaar (als er prognose-projecten zijn)
select count(*) from prognose_projecten;

-- 5c. Management kan schrijven — verwacht: 1 row inserted
-- Vervang [tenant_id] door het juiste tenant_id
-- insert into prognose_projecten (tenant_id, omschrijving, start_datum, duur_weken, status)
--   values ('[tenant_id]', 'RLS test project', current_date, 4, 'potentieel');

-- 5d. Management kan NIET schrijven naar toewijzingen — verwacht: error
-- insert into toewijzingen (tenant_id, monteur_id, project_id, datum_van, datum_tot)
--   values (get_user_tenant_id(), '[monteur_id]', '[project_id]', now(), now());

-- 5e. Cross-tenant isolatie prognose — verwacht: exact één tenant_id
-- Inloggen als willekeurige gebruiker van één tenant
select distinct tenant_id from prognose_projecten;

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
-- [ ] Stap 5a: planner ziet geen prognose_projecten (0 rijen)
-- [ ] Stap 5b: management ziet prognose_projecten
-- [ ] Stap 5c: management kan prognose_projecten aanmaken
-- [ ] Stap 5d: management kan niet naar toewijzingen schrijven
-- [ ] Stap 5e: prognose cross-tenant geblokkeerd
