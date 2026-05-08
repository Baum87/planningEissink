# Eissink Planning

Interne planningsapplicatie voor **Eissink Plafond en Wand Systemen**. Vervangt de Excel-planning en geeft een overzichtelijk rooster van eigen monteurs, ZZP'ers en vaste groepen, gekoppeld aan projecten in de database.

---

## Wat doet de applicatie

De app bestaat uit vier pagina's:

**Planning** — Het hart van de applicatie. Een horizontale tijdlijn (3 of 6 weken) met alle monteurs als rijen. Per cel zie je welk project iemand is toegewezen. Klik op een cel om de details te bekijken; beheerder en planner kunnen vanuit die popup ook direct bewerken of verwijderen. Groepen kunnen in één klik als geheel worden ingepland.

**Overzicht** — Hetzelfde rooster maar vanuit projectperspectief: projecten als rijen, per dag het aantal ingeplande monteurs. Klik op een cel om te zien wie er op die dag op het project zit. Ook beschikbaar in 3- of 6-weekse weergave.

**Projecten** — Tabel met alle lopende projecten, inclusief projectleider-initialen. Filterbaar op projectleider, doorzoekbaar op werknummer of omschrijving. Toont live hoeveel monteurs er vandaag op een project zitten en het totaal aantal mandagen. Nieuwe projecten aanmaken en bestaande bewerken via een modal.

**Monteurs** — Kaartoverzicht van alle eigen monteurs en ZZP'ers, inclusief expertise en de actieve toewijzing van vandaag. Monteurs zijn te groeperen in vaste teams (groepen). Groepen zijn inklapbaar in de planning en kunnen als blok worden ingepland.

---

## Rollen en toegang

De applicatie kent drie rollen, opgeslagen in `app_metadata` (niet aanpasbaar door de gebruiker zelf):

| Rol | Toegang |
|---|---|
| `beheerder` | Volledig: inplannen, bewerken, verwijderen, projecten en monteurs beheren |
| `planner` | Volledig: zelfde rechten als beheerder |
| `projectleider` | Alleen lezen: kan de planning en het overzicht bekijken via de info-popup, maar niets wijzigen |

Rollen worden toegewezen via de Supabase SQL Editor met de Supabase service-role sleutel:

```sql
SELECT auth.admin_update_user_by_id(
  '<user-uuid>',
  '{"app_metadata": {"rol": "beheerder"}}'
);
```

---

## Functies

### Planning & Overzicht
- **3 of 6 weken**: schakelaar in de toolbar wisselt tussen 21 en 42 dagen; bij 6 weken zijn kolommen smaller en cellen compact (geen tekst)
- **Weekend**: optioneel zichtbaar via een schakelaar
- **Feestdagen en bouwvak**: amber achtergrond op de betreffende kolommen; bij een periode-inplanning worden deze dagen automatisch overgeslagen
- **Projectleider-filter**: toon alleen monteurs of projecten van één specifieke projectleider
- **Info-popup**: klik op een gevulde cel om project, PL-initialen, monteur en datum te zien — toegankelijk voor alle rollen inclusief projectleider; beheerder/planner krijgt ook een "Bewerken"-knop

### Toewijzingen
- Eén databaserecord per werkdag (datum_van = datum_tot = dag); dit maakt correcte weekend- en feestdagselectie mogelijk
- Bij het aanmaken van een toewijzing over meerdere dagen worden weekends en feestdagen/bouwvak automatisch overgeslagen
- Een monteur op een enkel weekend-dag inplannen is wel mogelijk (los record)

### Periodes (feestdagen & bouwvak)
Beheer je via de `periodes`-tabel in Supabase:

| Kolom | Type | Voorbeeld |
|---|---|---|
| naam | text | `Eerste Kerstdag` |
| datum_van | date | `2025-12-25` |
| datum_tot | date | `2025-12-25` |
| type | text | `feestdag` of `bouwvak` |

Voeg elk jaar de gewenste periodes toe; de applicatie laadt ze automatisch in.

---

## Tech stack

| Onderdeel | Keuze | Versie |
|---|---|---|
| Framework | React | 19 |
| Bundler | Vite | 8 |
| Styling | Tailwind CSS | v3 |
| Database & auth | Supabase (PostgreSQL) | 2 |
| Taal | JavaScript (JSX) | ES Modules |
| Linter | ESLint | 10 |
| Font | Inter (Google Fonts) | — |

**Hosting-advies:** Vercel of Netlify (statische frontend, Supabase verzorgt de backend).

---

## Projectstructuur

```
src/
├── lib/
│   └── supabase.js              # Supabase client (leest uit .env.local)
├── context/
│   └── AuthContext.jsx          # Auth state, rol (uit app_metadata), uitloggen
├── pages/
│   ├── Planning.jsx             # Planningsrooster (monteurs × dagen)
│   ├── Overzicht.jsx            # Projectoverzicht (projecten × dagen)
│   ├── Projecten.jsx            # Projectbeheer
│   └── Monteurs.jsx             # Monteurs en groepbeheer
├── services/
│   ├── toewijzingenService.js   # CRUD toewijzingen (per werkdag)
│   ├── periodesService.js       # Ophalen feestdagen en bouwvak
│   ├── monteursService.js       # CRUD monteurs en groepen
│   └── projectenService.js      # CRUD projecten
├── App.jsx                      # Tabs, hoofd-layout, auth guard
└── main.jsx                     # Entrypoint
supabase-schema.sql              # Database schema
```

---

## Database schema

Zes tabellen in Supabase (PostgreSQL):

```
projecten    — werknummer, omschrijving, opdrachtgever, aanneemsom, plaats, adres,
               projectleider_initialen
monteurs     — voornaam, achternaam, type (Eissink/Onderaannemer), expertises[],
               bedrijfsnaam, telefoon, woonplaats
groepen      — naam
groep_leden  — koppeltabel groepen ↔ monteurs
toewijzingen — monteur_id, project_id, datum_van, datum_tot
               (altijd datum_van = datum_tot = één werkdag)
periodes     — naam, datum_van, datum_tot, type (feestdag | bouwvak)
```

Indexen zijn aangelegd op `toewijzingen(datum_van, datum_tot)`, `toewijzingen(monteur_id)`, `toewijzingen(project_id)` en `groep_leden(monteur_id)` voor snelle queries.

### Row Level Security

Alle tabellen hebben RLS ingeschakeld:

- **Lezen**: alle ingelogde gebruikers
- **Schrijven**: alleen rollen `beheerder` en `planner` (gecontroleerd via `get_user_rol()` die `app_metadata` uitleest)

---

## Lokaal opstarten

### 1. Vereisten

- Node.js 18 of hoger
- Een Supabase-project (gratis tier volstaat)

### 2. Installeren

```bash
git clone https://github.com/Baum87/planningEissink.git
cd planningEissink
npm install
```

### 3. Database aanmaken

Open de Supabase SQL Editor en voer het bestand `supabase-schema.sql` uit. Dit maakt alle tabellen, indexen en RLS-policies aan.

### 4. Omgevingsvariabelen instellen

Maak een bestand `.env.local` aan in de projectroot:

```
VITE_SUPABASE_URL=https://jouw-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

De URL en sleutel zijn te vinden in het Supabase dashboard onder **Project Settings → API**.

### 5. Starten

```bash
npm run dev
```

De applicatie is bereikbaar op `http://localhost:5173`.

---

## Beschikbare scripts

| Script | Wat het doet |
|---|---|
| `npm run dev` | Start de ontwikkelserver met hot reload |
| `npm run build` | Bouwt de productieversie in `/dist` |
| `npm run preview` | Bekijk de productieversie lokaal |
| `npm run lint` | Voert ESLint uit over de bronbestanden |

---

## Deployment

1. Verbind de GitHub-repo met Vercel of Netlify.
2. Stel de omgevingsvariabelen (`VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`) in via het dashboard van de hostingdienst.
3. Deploy — de build-opdracht is `npm run build`, de output-map is `dist`.

---

## Beveiliging

- Rollen worden uitsluitend via `app_metadata` toegewezen (server-side, niet aanpasbaar door de gebruiker).
- Row Level Security is actief op alle tabellen; schrijfrechten vereisen de rol `beheerder` of `planner`.
- De Supabase Anon Key is een publieke sleutel bedoeld voor clientgebruik — RLS bepaalt wat er daadwerkelijk toegankelijk is.
- `.env.local` staat in `.gitignore` en wordt nooit meegestuurd naar de repo.
- Voeg voor productie security headers toe via de configuratie van je hostingdienst (bijv. `vercel.json` of `_headers` bij Netlify).
