-- ============================================================
-- seed.sql
-- Twee tenants: Eissink (leeg) en Demo Afbouw BV (fictieve data).
-- Uitvoeren in: nieuw Supabase project → SQL Editor (na 001 + 002)
-- ============================================================

-- ─── Tenant 1: Eissink ──────────────────────────────────────

insert into tenants (id, naam, slug, primaire_kleur, label_project, label_monteur)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Eissink Plafond en Wand systemen',
  'eissink',
  '#2563eb',
  'project',
  'monteur'
);

insert into tenant_instellingen (tenant_id)
values ('a0000000-0000-0000-0000-000000000001');

-- ─── Tenant 2: Demo Afbouw BV ───────────────────────────────

insert into tenants (id, naam, slug, primaire_kleur, label_project, label_monteur)
values (
  'b0000000-0000-0000-0000-000000000002',
  'Demo Afbouw BV',
  'demo',
  '#059669',
  'project',
  'monteur'
);

insert into tenant_instellingen (tenant_id)
values ('b0000000-0000-0000-0000-000000000002');

-- ─── Demo monteurs ──────────────────────────────────────────

insert into monteurs (id, voornaam, achternaam, bedrijfsnaam, type, expertises, telefoon, woonplaats, tenant_id)
values
  (gen_random_uuid(), 'Jan',      'de Vries', 'Demo Afbouw BV', 'Intern',        array['Plafond', 'Wand'],     '0612345678', 'Amsterdam', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Peter',    'Bakker',   'Demo Afbouw BV', 'Intern',        array['Plafond'],             '0623456789', 'Utrecht',   'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Mohammed', 'Hassan',   'ZZP Hassan',     'Onderaannemer', array['Wand', 'Stucwerk'],    '0634567890', 'Rotterdam', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Erik',     'Smit',     'Demo Afbouw BV', 'Intern',        array['Plafond', 'Stucwerk'], '0645678901', 'Den Haag',  'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'Sven',     'Jansen',   'ZZP Jansen',     'Onderaannemer', array['Wand'],                '0656789012', 'Eindhoven', 'b0000000-0000-0000-0000-000000000002');

-- ─── Demo projecten ─────────────────────────────────────────

insert into projecten (id, werknummer, omschrijving, opdrachtgever, plaats, projectleider_initialen, kleur, tenant_id)
values
  (gen_random_uuid(), '2024-001', 'Renovatie kantoor Zuidas',    'ING Bank',      'Amsterdam', 'JV', '#dbeafe', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-002', 'Nieuwbouw appartementen',      'Bouwfonds',     'Utrecht',   'PB', '#dcfce7', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-003', 'Plafond winkelcentrum',        'Vastgoed Noord','Rotterdam',  'JV', '#fef3c7', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-004', 'Wanden ziekenhuis vleugel B', 'UMCG',          'Groningen', 'ES', '#fce7f3', 'b0000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), '2024-005', 'Interieur hotel centrum',      'NH Hotels',     'Amsterdam', 'PB', '#ede9fe', 'b0000000-0000-0000-0000-000000000002');

-- ─── Demo expertises ────────────────────────────────────────

insert into tenant_expertises (tenant_id, naam, volgorde) values
  ('b0000000-0000-0000-0000-000000000002', 'Plafonds',      1),
  ('b0000000-0000-0000-0000-000000000002', 'Wanden',        2),
  ('b0000000-0000-0000-0000-000000000002', 'Systeemwanden', 3),
  ('b0000000-0000-0000-0000-000000000002', 'Afsmeren',      4),
  ('b0000000-0000-0000-0000-000000000002', 'Overig',        5);

-- ─── Demo groepen ───────────────────────────────────────────

insert into groepen (id, naam, tenant_id)
values
  ('c0000000-0000-0000-0000-000000000001', 'Team Noord', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', 'Team Zuid',  'b0000000-0000-0000-0000-000000000002');
