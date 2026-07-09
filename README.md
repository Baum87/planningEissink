# Planning App

Multi-tenant planningsapplicatie voor afbouwbedrijven. Begonnen als intern systeem voor Eissink Plafond en Wand Systemen, commercieel aan te bieden aan andere bedrijven.

Live: [planning-eissink.vercel.app](https://planning-eissink.vercel.app)

---

## Wat doet de applicatie

**Planning** — Horizontale tijdlijn (3 of 8 weken) met monteurs als rijen. Klik op een lege cel om in te plannen, op een gevulde cel om te bekijken of te bewerken. Groepen zijn in één klik als geheel in te plannen.

**Overzicht** — Zelfde rooster maar vanuit projectperspectief: projecten als rijen, per dag het aantal ingeplande monteurs.

**Projecten** — Tabel met alle projecten. Aanmaken en bewerken via een modal.

**Monteurs** — Tabel met eigen monteurs en ZZP'ers, inclusief expertises en groepsbeheer.

**Prognose** — Horizontale tijdlijn (26 weken) voor management en admins. Potentiële en bevestigde projecten met aanneemsom, projectleider en kleur. Totaalregel per week. Eén klik zet een prognose-project om naar een operationeel project in de planningtab.

**Beheer** — Gebruikersbeheer voor admins: uitnodigen, rol wijzigen, verwijderen.

---

## Rollen

Opgeslagen in `app_metadata`. Beheer via het Beheer-tabblad in de app (alleen zichtbaar voor admin).

| Rol | Toegang |
|---|---|
| `admin` | Volledig + gebruikersbeheer + prognose |
| `management` | Prognose (CRUD) + overige tabs alleen lezen |
| `planner` | Volledig: inplannen, projecten, monteurs |
| `gebruiker` | Alleen lezen (projectleiders) |
| `monteur` | Toekomstig: eigen toewijzingen |

---

## Tech stack

| Onderdeel | Keuze |
|---|---|
| Framework | React 19 |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v3 |
| Database & auth | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Foutmonitoring | Sentry |
| Taal | JavaScript (JSX), ES Modules |

Zie [STACK.md](STACK.md) voor een uitgebreide beschrijving van elke dienst.

---

## Projectstructuur

```
src/
  context/
    AuthContext.jsx              # Auth state, rol, uitloggen
    TenantContext.jsx            # Tenant data en instellingen
  pages/
    Login.jsx                   # Wachtwoord vergeten ingebouwd
    Planning.jsx
    Overzicht.jsx
    Projecten.jsx
    Monteurs.jsx
    Prognose.jsx                # 26-weeks tijdlijn voor management/admin
    Beheer.jsx                  # Admin: gebruikersbeheer
  components/
    InplanModal.jsx
    PrognoseModal.jsx           # Aanmaken/bewerken prognose-projecten
  services/
    toewijzingenService.js
    projectenService.js
    monteursService.js
    periodesService.js
    expertisesService.js
    gebruikersbeheerService.js  # Roept Edge Function aan
    prognoseService.js          # CRUD prognose_projecten + in-opdracht
  lib/
    supabase.js
    avatar.js                   # avatarKleur, initialen, monteurNaam
    datum.js                    # getMaandag, plusDagen, fDatumLang, etc.
    kleurenpalet.js             # KLEURENPALET, minstGebruikteKleur, projKleur
  App.jsx
  main.jsx                      # Sentry initialisatie
supabase/
  migrations/                   # 001–024, in volgorde uitvoeren
  seed.sql                      # Tenants + demo-data voor nieuwe opzet
  tests/
    rls_smoke_test.sql          # Handmatige RLS verificatie na migraties
  functions/
    gebruikersbeheer/
      index.ts                  # Edge Function: invite, rol wijzigen, delete
    prognose-in-opdracht/
      index.ts                  # Edge Function: zet prognose om naar operationeel project
```

---

## Database

### Tenant-tabellen
```
tenants              — naam, slug, logo_url, primaire_kleur, labels
tenant_instellingen  — kolommen_config en modules_config (JSONB) per tenant
tenant_expertises    — expertises per tenant
audit_log            — mutaties per tenant
```

### Kern-tabellen (allemaal met tenant_id)
```
profielen            — koppelt auth.users aan app-identiteit (naam, afkorting, avatar_kleur)
projecten            — werknummer, omschrijving, plaats, projectleider_id (FK profielen)
monteurs             — voornaam, achternaam, type (Intern/Onderaannemer), expertises[]
groepen              — naam
groep_leden          — koppeltabel groepen ↔ monteurs
toewijzingen         — monteur_id, project_id, datum (datum_van = datum_tot = één werkdag)
periodes             — bouwvak en feestdagen (worden overgeslagen bij inplannen)
prognose_projecten   — omschrijving, start_datum, duur_weken, status, aanneemsom, bezetting_gemiddeld
                       operationeel_project_id (FK projecten) — gevuld na "in opdracht"
prognose_bezetting   — per-week override op bezetting_gemiddeld: week_offset (relatief t.o.v.
                       start_datum), aantal_monteurs, tekst (FK prognose_projecten, CASCADE DELETE)
```

### Multi-tenancy en RLS
Alle tabellen hebben RLS. Elke gebruiker ziet en muteert alleen data van zijn eigen tenant via `get_user_tenant_id()` en `get_user_rol()` (lezen uit JWT `app_metadata`).

---

## Lokaal opstarten

### 1. Installeren

```bash
git clone https://github.com/Baum87/planningEissink.git
cd planningEissink
npm install
```

### 2. Omgevingsvariabelen

Maak `.env.local` aan:

```
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
VITE_SENTRY_DSN=jouw-sentry-dsn
```

### 3. Database opzetten

Voer de migraties in volgorde uit in de Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
...
supabase/migrations/024_prognose_bezetting.sql
```

Daarna `supabase/seed.sql` voor de basis tenant-records.

### 4. Edge Function deployen

```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase link --project-ref <project-ref>
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy gebruikersbeheer
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy prognose-in-opdracht
```

### 5. Starten

```bash
npm run dev
```

---

## Deployment

Vercel deployt automatisch bij elke push naar `master`.

Vereiste environment variables in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN`

---

## Beschikbare scripts

| Script | Wat het doet |
|---|---|
| `npm run dev` | Ontwikkelserver met hot reload |
| `npm run build` | Productieversie in `/dist` |
| `npm run preview` | Productieversie lokaal bekijken |
| `npm run lint` | ESLint uitvoeren |
