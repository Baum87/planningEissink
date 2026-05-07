# Eissink Planning

Interne planningsapplicatie voor **Eissink Plafond en Wand Systemen**. Vervangt de Excel-planning en geeft een overzichtelijk 21-daags rooster van eigen monteurs, ZZP'ers en vaste groepen, gekoppeld aan projecten in de database.

---

## Wat doet de applicatie

De app bestaat uit drie pagina's:

**Planning** — Het hart van de applicatie. Een horizontale tijdlijn van drie weken met alle monteurs als rijen. Per cel zie je welk project iemand is toegewezen. Klik op een lege cel om iemand in te plannen, klik op een gekleurd blok om de toewijzing aan te passen of te verwijderen. Groepen kunnen in één klik als geheel worden ingepland.

**Projecten** — Tabel met alle lopende projecten. Sorteerbaar op elk veld, doorzoekbaar op werknummer, omschrijving of opdrachtgever. Toont live hoeveel monteurs er vandaag op een project zitten en het totaal aantal mandagen. Nieuwe projecten aanmaken en bestaande bewerken via een modal.

**Monteurs** — Kaartoverzicht van alle eigen monteurs en ZZP'ers, inclusief expertise en de actieve toewijzing van vandaag. Monteurs zijn te groeperen in vaste teams (groepen). Groepen zijn inklapbaar in de planning en kunnen als blok worden ingepland.

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
│   └── supabase.js          # Supabase client (leest uit .env.local)
├── pages/
│   ├── Planning.jsx         # 21-daags planningsrooster
│   ├── Projecten.jsx        # Projectenoverzicht en -beheer
│   └── Monteurs.jsx         # Monteurs en groepbeheer
├── services/
│   ├── toewijzingenService.js   # CRUD toewijzingen
│   ├── monteursService.js       # CRUD monteurs en groepen
│   └── projectenService.js      # CRUD projecten
├── App.jsx                  # Tabs en hoofd-layout
└── main.jsx                 # Entrypoint
supabase-schema.sql          # Database schema (uitvoeren in Supabase SQL editor)
```

---

## Database schema

Vijf tabellen in Supabase (PostgreSQL):

```
projecten        — werknummer, omschrijving, opdrachtgever, aanneemsom, plaats, adres
monteurs         — naam, type (eigen/zzp), expertises[], telefoon, woonplaats
groepen          — naam
groep_leden      — koppeltabel groepen ↔ monteurs
toewijzingen     — monteur_id, project_id, datum_van, datum_tot
```

Indexen zijn aangelegd op `toewijzingen(datum_van, datum_tot)`, `toewijzingen(monteur_id)`, `toewijzingen(project_id)` en `groep_leden(monteur_id)` voor snelle queries.

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

Open de Supabase SQL Editor en voer het bestand `supabase-schema.sql` uit. Dit maakt alle tabellen en indexen aan.

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

- De Supabase Anon Key is een publieke sleutel bedoeld voor clientgebruik; stel in Supabase **Row Level Security (RLS)** in op alle tabellen voor productiegebruik.
- `.env.local` staat in `.gitignore` en wordt nooit meegestuurd naar de repo.
- Voeg voor productie security headers toe via de configuratie van je hostingdienst (bijv. `vercel.json` of `_headers` bij Netlify).
