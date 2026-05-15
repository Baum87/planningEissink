# Planning App — projectcontext

## Wat wordt er gebouwd
Een planningsapplicatie voor afbouwbedrijven.
Begonnen als intern systeem voor Eissink Plafond en Wand systemen.
Commercieel aan te bieden aan andere afbouw- en installatiebedrijven.

## Bedrijfscontext (Eissink — tenant 1)
- 12 eigen monteurs (type: Intern), circa 100 zzp'ers (type: Onderaannemer)
- Circa 500 projecten per jaar, circa 50 lopende projecten per dag
- 1 planner — bewerkt de planning dagelijks
- 5 projectleiders — alleen inzien, filteren op eigen projecten
- Remco — admin, bouwer en eigenaar van het product

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
- `admin` — volledige toegang
- `planner` — volledige schrijfrechten (planning, projecten, monteurs, groepen, periodes)
- `gebruiker` — alleen lezen (voorheen: projectleider)
- `monteur` — toekomstig: alleen eigen toewijzingen inzien

## Gebruikersbeheer
Rollen én tenant_id worden opgeslagen in raw_app_meta_data:

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  jsonb_set(
    jsonb_set(raw_app_meta_data,
      '{rol}', '"gebruiker"'),
      '{naam}', '"Naam"'),
      '{tenant_id}', '"[tenant-uuid]"')
where email = 'email@domein.nl';
```

Gebruikersbeheerpagina en uitnodigingsflow: gepland via Supabase Edge Functions
(zie Commerciële roadmap).

## Profielen-architectuur

### Ontwerpbeslissing
`projectleider_initialen` op projecten is een legacy veld — fragiel (niet uniek,
niet universeel). De leidende relatie loopt via `projectleider_id` (UUID → profielen).

### profielen tabel (migratie 007)
Koppelt elke auth-gebruiker aan zijn app-identiteit:
- `id` — FK naar auth.users (cascade delete)
- `tenant_id`
- `weergave_naam` — volledige naam, verplicht ("Remco Baumeister")
- `afkorting` — optionele korte code, max 4 tekens ("RB"), niet verplicht
- `monteur_id` — FK naar monteurs (nullable), koppelt login aan monteur-record

### Display-logica (overal in de app)
```javascript
profiel.afkorting || profiel.weergave_naam
```

### Gevolgen per component
- **Projectformulier** — dropdown op profielen, slaat `projectleider_id` (UUID) op
- **Planning filter** — filtert op `projectleider_id`, toont `afkorting || weergave_naam`
- **Auto-filter bij login** — `gebruiker` ziet eigen projecten, `monteur` ziet eigen rijen
- **Eissink migratie** — `afkorting` = huidige initialen (eenmalig handmatig invullen)

### Nog te bouwen (aparte branch)
- Edge Function gebruikersbeheer (invite, rol wijzigen, delete)
- Gebruikersbeheer scherm (admin-only tab)
- Projectformulier dropdown
- Planning filter op UUID + auto-filter per rol

## Database tabellen

### Profielen (nieuw — migratie 007)
- profielen: id (FK auth.users), tenant_id, weergave_naam, afkorting, monteur_id, created_at

### Multi-tenancy tabellen (migratie 001)
- tenants: id, naam, slug, logo_url, primaire_kleur, label_project, label_monteur, actief, created_at
- tenant_instellingen: id, tenant_id, kolommen_config (JSONB), modules_config (JSONB), updated_at
- tenant_expertises: id, tenant_id, naam, volgorde, created_at
- audit_log: id, tenant_id, user_id, actie, tabel, record_id, oude_waarde (JSONB), nieuwe_waarde (JSONB), created_at

### Bestaande tabellen (uitgebreid met tenant_id)
- projecten: id, tenant_id, werknummer, omschrijving, plaats, adres,
  opdrachtgever, opmerkingen, extern_id, projectleider_initialen (legacy),
  projectleider_id (FK profielen, nullable), kleur, created_at
- monteurs: id, tenant_id, voornaam, achternaam, bedrijfsnaam,
  type (Intern/Onderaannemer), expertises[], telefoon, woonplaats, adres,
  extern_id, created_at
- groepen: id, tenant_id, naam, created_at
- groep_leden: groep_id, monteur_id (composite PK)
- toewijzingen: id, tenant_id, monteur_id, project_id, datum_van, datum_tot, created_at
  (datum_van = datum_tot = één werkdag per record — weekenden worden overgeslagen bij aanmaken)
- periodes: id, tenant_id, naam, datum_van, datum_tot, created_at
  (bouwvak/feestdagen — worden overgeslagen bij inplannen)

### Indexen
- idx_projecten_tenant_id, idx_monteurs_tenant_id, idx_groepen_tenant_id
- idx_toewijzingen_tenant_id, idx_toewijzingen_monteur_datum, idx_toewijzingen_project_datum
- idx_audit_log_tenant_id, idx_audit_log_created_at

## Tenant IDs
- Eissink: a0000000-0000-0000-0000-000000000001
- Demo Afbouw BV: b0000000-0000-0000-0000-000000000002

## Supabase projecten
- Test/ontwikkeling: planning_app (project ID: zie .env)
- Oud Eissink project (archief, niet aanraken): qrnsjldoeobipqclpdxu

## Migraties
```
001_initial_schema.sql     — tabellen, indexen
002_rls_policies.sql       — RLS + helper functies get_user_rol() / get_user_tenant_id()
003_monteur_type_intern.sql — type 'Eissink' hernoemd naar 'Intern'
004_aanneemsom_opmerkingen_expertises.sql — aanneemsom verwijderd, opmerkingen/adres/expertises per tenant
005_rename_roles.sql       — rollen hernoemd: beheerder→admin, planner→gebruiker, monteur toegevoegd
006_grants.sql             — expliciete GRANTs voor authenticated rol (vereist vanaf Supabase mei 2026)
007_profielen.sql          — profielen tabel + projectleider_id op projecten
```

Eissink-data migratiescripts (eenmalig):
```
migrate_eissink_prep.sql   — NOT NULL tijdelijk loslaten vóór CSV-import
migrate_eissink.sql        — tenant_id toewijzen + expertises toevoegen na CSV-import
```

## RLS
Alle tabellen hebben RLS aan.
- `get_user_rol()` — leest uit `auth.jwt() -> 'app_metadata' ->> 'rol'`
- `get_user_tenant_id()` — leest uit `auth.jwt() -> 'app_metadata' ->> 'tenant_id'`
- Alle SELECT policies filteren op `tenant_id = get_user_tenant_id()`
- Schrijfrechten: `admin` en `planner`
- Profielen schrijven: alleen `admin`
- Audit log: alleen leesbaar voor `admin`

### RLS audit — mei 2026
Analyse via pg_policies en helper-functies. Gevonden en opgelost:
- UPDATE policy op toewijzingen miste with_check — toegevoegd in 009

Bewust niet gewijzigd:
- get_user_tenant_id() NULL-gedrag is al veilig in PostgreSQL
- audit_log INSERT with_check was al correct
- get_user_rol() fallback 'geen' is functioneel identiek aan ''

Bewust uitgesteld:
- gebruiker-rol ziet alle toewijzingen/monteurs van eigen tenant
  (scope-beperking volgt via projectleider_id koppeling)

Smoke test beschikbaar: supabase/tests/rls_smoke_test.sql

## UI — vier tabbladen
1. **Planning** — tijdlijn (3 of 8 weken), monteurs als rijen, 100px dagkolommen,
   horizontaal scrollbaar, weekend aan/uit schakelaar,
   filter op projectleider (huidig: initialen-tekst, toekomstig: UUID via profielen)
2. **Projecten** — sorteerbare tabel, kolommen conditioneel per tenant_instellingen,
   horizontale scroll altijd zichtbaar (tabel vult viewporthoogte)
3. **Monteurs** — sorteerbare tabel met groepsbeheer, kolommen conditioneel per tenant_instellingen,
   horizontale scroll altijd zichtbaar (tabel vult viewporthoogte)
4. **Overzicht** — projecten als rijen, tijdlijn toont aantal monteurs per dag,
   klikken toont popup met monteursnamen

Tabbladen conditioneel zichtbaar op basis van modules_config in tenant_instellingen.

## Inplannen
- Klikken op lege cel → modal met project zoekfunctie + van/tot datum
- Weekenden en periodes (bouwvak/feestdagen) worden automatisch overgeslagen
- Klikken op gevulde cel → modal met verwijder dag, verwijder periode, wijzigen
- Groepen inplannen = alle leden krijgen individuele toewijzing
- Maximaal 2 projecten per dag per monteur, getoond als blokken naast elkaar
- PostgREST max_rows omzeild via paginatie in toewijzingenService (.range())

## Design
- Apple-achtig: minimalistisch, wit, veel witruimte
- Font: Inter
- Kleur per project deterministisch op project-id, pool van 8 kleuren
- Bedrijfsnaam en logo komen uit tenants tabel (niet hardcoded)

## Mappenstructuur
```
src/
  context/
    AuthContext.jsx
    TenantContext.jsx
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
    expertisesService.js
  lib/
    supabase.js
    kleurenpalet.js
  App.jsx
  main.jsx
supabase/
  migrations/
    001_initial_schema.sql
    ...
    007_profielen.sql
  seed.sql
  migrate_eissink.sql
  migrate_eissink_prep.sql
```

## Bekende verbeterpunten
- [ ] Planning filter: groepen altijd zichtbaar ook als geen enkel groeplid een toewijzing heeft
      die overeenkomt met het actieve filter — groep verbergen als alle leden leeg zijn na filtering

## Commerciële roadmap
- [ ] Edge Function gebruikersbeheer (invite, rol wijzigen, delete via service_role)
- [ ] Gebruikersbeheerpagina per tenant (admin-only tab)
- [ ] Profielen koppelen in projectformulier (dropdown i.p.v. tekstveld initialen)
- [ ] Planning filter op UUID + auto-filter per rol bij login
- [ ] Drag-and-drop via dnd-kit (blokken slepen — CSS-structuur al rekening mee houden)
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
- Geen realtime samenwerking
- Geen zoombare tijdlijn
