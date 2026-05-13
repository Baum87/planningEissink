# Planning App — projectcontext

## Wat wordt er gebouwd
Een planningsapplicatie voor afbouwbedrijven.
Begonnen als intern systeem voor Eissink Plafond en Wand systemen.
Commercieel aan te bieden aan andere afbouw- en installatiebedrijven.

## Bedrijfscontext (Eissink — tenant 1)
- 12 eigen monteurs (type: Eissink), circa 100 zzp'ers (type: Onderaannemer)
- Circa 500 projecten per jaar, circa 50 lopende projecten per dag
- 1 planner — bewerkt de planning dagelijks
- 5 projectleiders — alleen inzien, filteren op eigen projecten via initialen
- Remco — beheerder, bouwer en eigenaar van het product

## Stack
- Frontend: React + Tailwind CSS
- Backend/database: Supabase (PostgreSQL)
- Hosting: Vercel
- Auth: Supabase Auth, rollen opgeslagen in raw_app_meta_data

## Architectuurprincipes
- Multi-tenant: alle data gescheiden per tenant via RLS en tenant_id
- Modulair gebouwd: elke feature is een losstaand blok
- ERP-koppeling in achterhoofd: projecten én monteurs hebben een extern_id veld
- Alle mutaties lopen via één service-laag
- Rollen worden uitgelezen via app_metadata (niet user_metadata)
- Kolommen en modules configureerbaar per tenant via tenant_instellingen (JSONB)

## Rollen
- beheerder: volledige toegang
- planner: volledige toegang tot planning, projecten, monteurs
- projectleider: alleen inzien, filter op eigen initialen

## Gebruikersbeheer
Rollen én tenant_id worden opgeslagen in raw_app_meta_data:

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(raw_app_meta_data,
        '{rol}', '"planner"'),
        '{initialen}', '"XX"'),
        '{naam}', '"Naam"'),
        '{tenant_id}', '"[tenant-uuid]"')
where email = 'email@domein.nl';
```

## Database tabellen

### Nieuwe tabellen (multi-tenancy)
- tenants: id, naam, slug, logo_url, primaire_kleur, label_project, label_monteur, actief, created_at
- tenant_instellingen: id, tenant_id, kolommen_config (JSONB), modules_config (JSONB), updated_at
- audit_log: id, tenant_id, user_id, actie, tabel, record_id, oude_waarde (JSONB), nieuwe_waarde (JSONB), created_at

### Bestaande tabellen (uitgebreid met tenant_id)
- projecten: id, tenant_id, werknummer, omschrijving, plaats, adres, aanneemsom,
  opdrachtgever, extern_id, projectleider_initialen, created_at
- monteurs: id, tenant_id, voornaam, achternaam, bedrijfsnaam, type (Eissink/Onderaannemer),
  expertises[], telefoon, woonplaats, extern_id, created_at
- groepen: id, tenant_id, naam, created_at
- groep_leden: groep_id, monteur_id
- toewijzingen: id, tenant_id, monteur_id, project_id, datum, created_at

### Indexen
- idx_projecten_tenant_id, idx_monteurs_tenant_id, idx_groepen_tenant_id
- idx_toewijzingen_tenant_id, idx_toewijzingen_monteur_datum, idx_toewijzingen_project_datum
- idx_audit_log_tenant_id, idx_audit_log_created_at

## Tenant IDs
- Eissink: a0000000-0000-0000-0000-000000000001
- Demo Afbouw BV: b0000000-0000-0000-0000-000000000002

## RLS
Alle tabellen hebben RLS aan.
- get_user_rol() — leest uit auth.jwt() -> 'app_metadata' ->> 'rol'
- get_user_tenant_id() — leest uit auth.jwt() -> 'app_metadata' ->> 'tenant_id'
- Alle SELECT policies filteren op tenant_id = get_user_tenant_id()
- Schrijfrechten: beheerder en planner
- Audit log: alleen leesbaar voor beheerder

## UI — vier tabbladen
1. Planning — 3-weeks tijdlijn, monteurs als rijen, 100px dagkolommen,
   horizontaal scrollbaar, weekend aan/uit schakelaar,
   filter op projectleider initialen
2. Projecten — sorteerbare tabel, kolommen conditioneel per tenant_instellingen
3. Monteurs — sorteerbare tabel met groepsbeheer, kolommen conditioneel per tenant_instellingen
4. Overzicht — projecten als rijen, tijdlijn toont aantal monteurs per dag,
   klikken toont popup met monteursnamen, filter op projectleider initialen

Tabbladen conditioneel zichtbaar op basis van modules_config in tenant_instellingen.

## Inplannen
- Klikken op lege cel → modal met project zoekfunctie + van/tot datum
- Weekenden worden automatisch overgeslagen bij periode inplannen
- Klikken op gevulde cel → modal met verwijder dag, verwijder periode, wijzigen
- Groepen inplannen = alle leden krijgen individuele toewijzing
- Maximaal 2 projecten per dag per monteur, getoond als blokken naast elkaar

## Design
- Apple-achtig: minimalistisch, wit, veel witruimte
- Font: Inter
- Kleur per project deterministisch op project-id, pool van 8 kleuren
- Bedrijfsnaam en logo komen uit tenants tabel (niet hardcoded)

## Mappenstructuur
```
src/
  components/
  context/
    AuthContext.jsx
    TenantContext.jsx       ← nieuw
  pages/
    Login.jsx
    Planning.jsx
    Projecten.jsx
    Monteurs.jsx
    Overzicht.jsx
  services/
    projectenService.js
    monteursService.js
    toewijzingenService.js
    periodesService.js
  lib/
    supabase.js
    utils.js               ← nieuw: datum en kleur utilities (gededupliceerd)
  App.jsx
  main.jsx
supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
  seed.sql
  migrate_eissink.sql
```

## Supabase projecten
- Productie (multi-tenant): [nieuw project ID na migratie]
- Oud Eissink project (archief na migratie): qrnsjldoeobipqclpdxu

## Commerciële roadmap
- [ ] Gebruikersbeheerpagina per tenant via Supabase Edge Functions
- [ ] Uitnodigingsflow voor nieuwe gebruikers (magic link)
- [ ] Drag-and-drop via dnd-kit (blokken slepen en resizen)
- [ ] Optimistic updates via React Query of SWR
- [ ] Audit log triggers op alle tabellen
- [ ] Realtime samenwerking (Supabase Realtime)
- [ ] ERP koppeling via extern_id en webhook patroon (Edge Functions)
- [ ] Logo upload per tenant (Supabase Storage)
- [ ] Supabase Pro upgrade bij groei
- [ ] app.byggr.nl als primair domein (Vercel custom domain)
- [ ] PWA/offline support (indien klanten hierom vragen)

## Bewust buiten scope (v1)
- Geen drag-and-drop (architectuur is er wel klaar voor)
- Geen ERP-koppeling (extern_id wel in datamodel op projecten én monteurs)
- Geen gebruikersbeheerpagina (via Edge Functions later)
- Geen realtime samenwerking
- Geen zoombare tijdlijn
