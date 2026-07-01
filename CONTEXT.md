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
- Hosting: Vercel (custom domain: planning.byggr.nl)
- Auth: Supabase Auth, rollen opgeslagen in raw_app_meta_data
- Data fetching: @tanstack/react-query (gedeelde hooks in src/hooks/queries.js)
- Drag & drop: @dnd-kit/core
- Grafieken: recharts (Statistieken pagina)
- Foutlogging: @sentry/react (DSN in .env.local + Vercel)

## Architectuurprincipes
- Multi-tenant: alle data gescheiden per tenant via RLS en tenant_id
- Modulair gebouwd: elke feature is een losstaand blok
- ERP-koppeling in achterhoofd: projecten én monteurs hebben een extern_id veld
- Alle mutaties lopen via één service-laag
- Rollen worden uitgelezen via app_metadata (niet user_metadata)
- Kolommen en modules configureerbaar per tenant via tenant_instellingen (JSONB)

## Rollen
- `admin` — volledige toegang, inclusief Beheer en Statistieken tabbladen
- `planner` — volledige schrijfrechten (planning, projecten, monteurs, groepen, periodes)
- `gebruiker` — alleen lezen (voorheen: projectleider), auto-filter op eigen naam bij login
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

Gebruikersbeheer verloopt via de Beheer-pagina (admin-only tab) + Edge Function `gebruikersbeheer`.
Ondersteunde acties: uitnodigen via e-mail, direct aanmaken met wachtwoord, rol wijzigen, verwijderen.
Invites sturen een Supabase magic link; ontvanger stelt wachtwoord in via WachtwoordInstellen scherm in de app.

## Profielen-architectuur

### Ontwerpbeslissing
`projectleider_initialen` op projecten is een legacy veld — fragiel (niet uniek, niet universeel).
De leidende relatie loopt via `projectleider_id` (UUID → profielen).
Migratie 012 heeft alle bestaande projecten gekoppeld (168 projecten, via initialen → afkorting match).

### profielen tabel (migratie 007 + uitbreidingen 010, 011)
Koppelt optioneel een loginaccount aan een app-identiteit. Profielen kunnen bestaan *zonder* loginaccount
(bijv. projectleiders die de app niet gebruiken maar wel in dropdowns moeten verschijnen).

- `id` — PK (gen_random_uuid() default; niet meer gebonden aan auth.users)
- `user_id` — nullable FK naar auth.users (cascade set null); uniek per tenant; dit is de login-koppeling
- `tenant_id`
- `weergave_naam` — volledige naam, verplicht ("Remco Baumeister")
- `afkorting` — optionele korte code, max 4 tekens ("RB"); UNIQUE per tenant (nulls toegestaan)
- `monteur_id` — FK naar monteurs (nullable), koppelt login aan monteur-record

### Display-logica (overal in de app)
```javascript
profiel.afkorting || profiel.weergave_naam
```

### Gevolgen per component
- **Projectformulier** — dropdown op profielen, slaat `projectleider_id` (UUID) op
- **Planning filter** — filtert op `projectleider_id`, toont `afkorting || weergave_naam`
- **Auto-filter bij login** — `gebruiker` ziet eigen projecten, `monteur` ziet eigen rijen
- **Eissink migratie** — `afkorting` = huidige initialen (handmatig ingevuld, 012 koppelde 168 projecten)

## Database tabellen

### Profielen (migratie 007 + 010 + 011)
- profielen: id (UUID PK, gen_random_uuid()), user_id (nullable FK auth.users, unique), tenant_id,
  weergave_naam, afkorting (unique per tenant), monteur_id, created_at

### Multi-tenancy tabellen (migratie 001)
- tenants: id, naam, slug, logo_url, primaire_kleur, label_project, label_monteur, actief, created_at
  (`favicon_url` kolom verwijderd in migratie 017 — logo_url was al aanwezig en wordt gebruikt)
- tenant_instellingen: id, tenant_id, kolommen_config (JSONB), modules_config (JSONB), updated_at
- tenant_expertises: id, tenant_id, naam, volgorde, created_at
- audit_log: id, tenant_id, user_id, actie, tabel, record_id, oude_waarde (JSONB), nieuwe_waarde (JSONB), created_at

### Bestaande tabellen (uitgebreid met tenant_id)
- projecten: id, tenant_id, werknummer, omschrijving, plaats, adres,
  opdrachtgever, opmerkingen, extern_id, projectleider_initialen (legacy, niet meer leidend),
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
001_initial_schema.sql              — tabellen, indexen
002_rls_policies.sql                — RLS + helper functies get_user_rol() / get_user_tenant_id()
003_monteur_type_intern.sql         — type 'Eissink' hernoemd naar 'Intern'
004_aanneemsom_opmerkingen_expertises.sql — aanneemsom verwijderd, opmerkingen/adres/expertises per tenant
005_rename_roles.sql                — rollen hernoemd: beheerder→admin, planner→gebruiker, monteur toegevoegd
006_grants.sql                      — expliciete GRANTs voor authenticated rol (vereist vanaf Supabase mei 2026)
007_profielen.sql                   — profielen tabel + projectleider_id op projecten
008_bugfixes_rls.sql                — diverse RLS bugfixes
009_rls_update_with_check.sql       — UPDATE policy op toewijzingen kreeg with_check
010_afkorting_unique_per_tenant.sql — UNIQUE(tenant_id, afkorting) op profielen (nulls toegestaan)
011_profielen_zonder_login.sql      — profielen ontkoppeld van auth.users: user_id kolom toegevoegd (nullable FK),
                                      id-FK verwijderd, id krijgt gen_random_uuid() als default
012_koppel_projectleider_id.sql     — vult projecten.projectleider_id via initialen→afkorting match (168 projecten)
013_datum_check_constraints.sql     — CHECK constraints op datum_volgorde in toewijzingen en periodes
014_fix_helper_functies_security.sql — SECURITY DEFINER + search_path op helper functies
015_revoke_anon_helper_functies.sql  — REVOKE EXECUTE op helper functies voor anon rol
016_audit_log_triggers.sql          — AFTER triggers (log_wijziging) op projecten, monteurs, toewijzingen
017_favicon_url_tenant.sql          — favicon_url kolom verwijderd; data overgenomen naar logo_url
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
- Helper functies: SECURITY DEFINER, SET search_path = '', REVOKE voor anon (migraties 014 + 015)

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

## Audit log triggers (migratie 016)
AFTER triggers op `projecten`, `monteurs` en `toewijzingen` vullen `audit_log` automatisch.
Trigger-functie `log_wijziging()`: SECURITY DEFINER, logt INSERT/UPDATE/DELETE.
Fouten bij het wegschrijven worden stilzwijgend opgevangen (EXCEPTION WHEN OTHERS THEN NULL)
zodat een logging-fout de app-actie nooit blokkeert.

## UI — zes tabbladen
1. **Planning** — tijdlijn (3 of 8 weken), monteurs als rijen, 100px dagkolommen,
   horizontaal scrollbaar, weekend aan/uit schakelaar,
   filter op projectleider (UUID via profielen), expertise en project.
   Drag & drop via dnd-kit: blokken slepen naar andere dag of monteur,
   aaneengesloten periodes verplaatsen mee. Uitgeschakeld in 8-weken modus.
   Auto-filter: `gebruiker` ziet bij login direct eigen projecten.
2. **Overzicht** — projecten als rijen, tijdlijn toont aantal monteurs per dag,
   klikken toont popup met monteursnamen. Mobiel: 3-daagse weergave.
3. **Projecten** — sorteerbare tabel, kolommen conditioneel per tenant_instellingen,
   horizontale scroll altijd zichtbaar (tabel vult viewporthoogte)
4. **Monteurs** — sorteerbare tabel met groepsbeheer, kolommen conditioneel per tenant_instellingen,
   horizontale scroll altijd zichtbaar (tabel vult viewporthoogte)
5. **Beheer** *(admin only)* — twee sub-tabs:
   - **Gebruikers** — profielen aanmaken (met of zonder loginaccount), uitnodigen via e-mail,
     wachtwoord direct instellen, rol wijzigen, account koppelen aan bestaand profiel, verwijderen
   - **Periodes** — bouwvak/feestdagen aanmaken en beheren
6. **Statistieken** *(admin only)* — bar charts (recharts) van inplanning per dag of per maand,
   uitgesplitst naar Intern vs. Onderaannemer. Periodefilter instelbaar.

Tabbladen conditioneel zichtbaar op basis van rol (Beheer + Statistieken: alleen `admin`).
Modules ook configureerbaar per tenant via modules_config in tenant_instellingen.

Header bevat: tenant-logo + naam, navigatietabs, UpdatesBadge (update-notificatie per rol),
gebruikersnaam, info-icoon (opent Handleiding modal), uitlogknop.
Mobiel: hamburger-menu met dezelfde opties in een dropdown.

## Inplannen
- Klikken op lege cel → modal met project zoekfunctie + van/tot datum
- Weekenden en periodes (bouwvak/feestdagen) worden automatisch overgeslagen
- Klikken op gevulde cel → modal met verwijder dag, verwijder periode, wijzigen
- Groepen inplannen = alle leden krijgen individuele toewijzing
- Maximaal 2 projecten per dag per monteur, getoond als blokken naast elkaar
- PostgREST max_rows omzeild via paginatie in toewijzingenService (.range())
- Drag & drop: blok naar andere dag of rij slepen; hele aaneengesloten periode verplaatst mee

## Design
- Apple-achtig: minimalistisch, wit, veel witruimte
- Font: Inter
- Kleur per project deterministisch op project-id, pool van 8 kleuren
- Bedrijfsnaam en logo komen uit tenants tabel (niet hardcoded); logo ook als favicon

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
    Beheer.jsx          — gebruikersbeheer + periodes (admin only)
    Statistieken.jsx    — bar charts inplanning (admin only)
  components/
    InplanModal.jsx     — inplan/wijzig modal (extracted uit Planning.jsx)
    MonteurPopup.jsx    — popup met monteursnamen bij Overzicht-cel klik
    ProjectZoeker.jsx   — herbruikbare projectzoek-dropdown
    UpdatesBadge.jsx    — update-notificatie badge (localStorage persistentie per rol)
  services/
    projectenService.js
    monteursService.js
    toewijzingenService.js
    periodesService.js
    expertisesService.js
    gebruikersbeheerService.js  — Edge Function wrapper (uitnodigen, aanmaken, rol wijzigen, etc.)
  hooks/
    useIsMobile.js
    useAsyncData.js     — generieke async data hook
    useZoek.js          — debounced zoekbalk hook (useDeferredValue)
    queries.js          — gedeelde React Query hooks (useToewijzingen, usePeriodes, etc.)
  lib/
    supabase.js
    kleurenpalet.js
    datum.js            — datum-utilities (naarStr, plusDagen, fDatumKort, etc.)
    avatar.js           — avatarKleur hash
    profielen.js        — profiel display-logica helpers
    updates.js          — update-register (changelog entries per versie/rol)
  App.jsx
  main.jsx
supabase/
  migrations/
    001_initial_schema.sql
    ...
    017_favicon_url_tenant.sql
  tests/
    rls_smoke_test.sql
  seed.sql
  migrate_eissink.sql
  migrate_eissink_prep.sql
docs/
  handleiding-gebruikers.md
  verwerkersovereenkomst.md
  privacyverklaring.md
  onboarding-nieuwe-tenant.md
```

## Bekende verbeterpunten
- [ ] Planning filter: groepen altijd zichtbaar ook als geen enkel groeplid een toewijzing heeft
      die overeenkomt met het actieve filter — groep verbergen als alle leden leeg zijn na filtering
- [ ] Statistieken: ziek/vrij projecten vertekenen het beeld — `is_afwezigheid boolean` kolom toevoegen
- [ ] UNIQUE constraint op toewijzingen: `(tenant_id, monteur_id, project_id, datum_van)` voorkomt
      theoretische duplicaten bij drag & drop + netwerkverlies
- [ ] Changelog tabblad in Beheer — data al beschikbaar in updates.js, UI ontbreekt nog

## Commerciële roadmap
- [ ] Mobile monteur-view — lees-only view eigen toewijzingen (174 potentiële gebruikers)
- [ ] Optimistic updates via React Query (useOptimisticMutation)
- [ ] Realtime samenwerking (Supabase Realtime) — bij implementatie: refetchInterval verwijderen
- [ ] ERP koppeling via extern_id en webhook patroon (Edge Functions)
- [ ] Logo upload per tenant (Supabase Storage)
- [ ] Supabase Pro upgrade bij eerste betalende klant (dagelijkse backups, PITR, Frankfurt DC)
- [ ] Demo-omgeving: aparte tenant met seed data voor sales-demo's
- [ ] PWA/offline support (indien klanten hierom vragen)

## Bewust buiten scope (v1)
- Geen zoombare tijdlijn
- Geen ERP-koppeling (extern_id wel in datamodel op projecten én monteurs)
- Geen realtime samenwerking
- Geen unit/integratietests/E2E (1 klant, 3 gebruikers — overkill nu)
