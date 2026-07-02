# Prognose-tijdlijn — bouwplan

Gebaseerd op de ontwerpbeslissingen in CONTEXT.md (sectie "Prognose-tijdlijn").
Volgorde is bewust: database eerst, dan service, dan UI.

---

## Stap 1 — Database (migratie 018)

- [x] `prognose_config jsonb DEFAULT '{}'` kolom toevoegen aan `tenant_instellingen`
- [x] Tabel `prognose_projecten` aanmaken:
  - id, tenant_id, naam, omschrijving, projectnummer
  - projectleider_id (nullable FK → profielen, ON DELETE SET NULL)
  - status ('potentieel' | 'in_opdracht', default 'potentieel')
  - status_gewijzigd_op (timestamptz, nullable)
  - aanneemsom (numeric 12,2, nullable)
  - start_datum (date — altijd maandag)
  - duur_weken (int, CHECK > 0)
  - bezetting_gemiddeld (numeric 5,1, nullable) — v1: niet in UI, klaar voor toekomstige per-week bezetting
  - kleur (varchar 7, nullable)
  - operationeel_project_id (nullable FK → projecten, ON DELETE SET NULL)
  - created_at, updated_at
- [x] Tabel `prognose_bezetting` NOG NIET aanmaken — schema gedocumenteerd in CONTEXT.md voor later
- [x] RLS op `prognose_projecten`:
  - SELECT/INSERT/UPDATE/DELETE: `get_user_rol() IN ('admin', 'management') AND tenant_id = get_user_tenant_id()`
- [x] Index op `(tenant_id, start_datum)` voor tijdlijn-queries
- [ ] Smoke test uitbreiden in `rls_smoke_test.sql`:
  - planner kan prognose_projecten niet lezen
  - management kan toewijzingen niet schrijven
  - management kan prognose_projecten lezen en schrijven

---

## Stap 2 — Edge Function: prognose-in-opdracht

- [ ] Nieuwe Edge Function `supabase/functions/prognose-in-opdracht/`
  - Ontvangt: `prognose_project_id`
  - Valideert: aanroeper is `admin` of `management`, zelfde tenant
  - Maakt record aan in `projecten` (service_role):
    `naam → omschrijving`, `projectnummer → werknummer`, `projectleider_id → projectleider_id`, `kleur → kleur`
  - Zet `operationeel_project_id` op het prognose-record
  - Zet `status = 'in_opdracht'` en `status_gewijzigd_op = now()`
  - Geeft het nieuwe `projecten`-record terug
- [ ] Patroon volgen van bestaande `gebruikersbeheer` Edge Function (zelfde auth-header structuur)

---

## Stap 3 — Service en hooks

- [x] `src/services/prognoseService.js`:
  - `getPrognoseProjecten(van, tot)` — haalt projecten op die de periode overlappen
  - `createPrognoseProject(velden)`
  - `updatePrognoseProject(id, velden)`
  - `deletePrognoseProject(id)`
  - `setInOpdracht(id)` — roept Edge Function aan (stub, werkt na Stap 2)
- [x] `src/hooks/queries.js` uitbreiden:
  - `usePrognoseProjecten(van, tot)` — React Query hook

---

## Stap 4 — AuthContext

- [x] Helper `isManagement(rol)` toevoegen: `rol === 'management'`
- [x] Helper `kanPrognose(rol)` toevoegen: `rol === 'admin' || rol === 'management'`

---

## Stap 5 — App.jsx

- [x] Tab toevoegen aan `ALLE_TABS`:
  `{ id: 'prognose', label: 'Prognose', component: Prognose, rollen: ['admin', 'management'] }`
- [x] Import van `Prognose` pagina toevoegen

---

## Stap 6 — PrognoseModal.jsx

- [ ] Aanmaken-modus: startweek voorgevuld op aangeklikte cel
- [ ] Bewerkstand: bestaand prognose-project laden
- [ ] Veldvolgorde:
  1. Omschrijving (verplicht)
  2. Projectnummer
  3. Opdrachtgever
  4. Projectleider (dropdown op profielen)
  5. Status (standaard: in_opdracht; toggle potentieel / in_opdracht)
  6. Aanneemsom (€ prefix)
  7. Startweek (weekkiezer — snap naar maandag via `getMaandag()`)
  8. Duur in weken (verplicht)
  - Eindweek als readonly preview: `start_datum + duur_weken × 7`
  - Kleur: auto-toegewezen via `minstGebruikteKleur()`, optioneel aanpasbaar
  - Geen bezettingsvelden
- [ ] Statusovergang naar `in_opdracht`: bevestigingsscherm met uitleg
      ("Dit maakt automatisch een operationeel project aan voor de planner.")
- [ ] Verwijder-knop (met bevestiging) — verwijdert alleen prognose-record, niet het operationele project
- [ ] Inline fout-state (geen alert()) — zelfde patroon als InplanModal

---

## Stap 7 — Prognose.jsx (hoofdcomponent)

### Toolbar
- [ ] Navigatie ‹ Vandaag › — springt per 4 weken
- [ ] Periodeweergave label (bijv. "Wk 27 – Wk 52 · 2025")
- [ ] Toggle "Potentieel tonen" aan/uit
- [ ] Knop "Nieuw project" rechts — opent PrognoseModal zonder voorgevulde cel

### Tijdlijn grid
- [ ] Week-header — sticky top, 26 kolommen (~85px breed)
- [ ] Rijstructuur: platte lijst gesorteerd op PL-initialen (afkorting), zonder-PL onderaan
- [ ] Linkerkolom drie delen:
  - PL-kleurblokje met initialen via `avatarKleur(profielnaam)` (~40px)
  - Omschrijving (bold) + opdrachtgever (grijs, klein) — flex-1
  - Aanneemsom + duur in weken rechts (~100px)
- [ ] Cel-rendering per week:
  - Project overlapt week → cel toont projectkleur via `projKleur()`
  - `potentieel` → gestreept (`repeating-linear-gradient(45deg, ...)` over de kleur)
  - `in_opdracht` → solide kleur
  - Geen tekst in de balk; details bij klik (PrognoseModal)
- [ ] Klik lege cel → PrognoseModal aanmaken, startweek voorgevuld
- [ ] Klik gevulde balk → PrognoseModal bewerken (startweek + duur aanpasbaar)

### Totaalregel
- [ ] Sticky onderaan (`position: sticky; bottom: 0`)
- [ ] Per week: som van aanneemsom ÷ duur_weken over alle zichtbare projecten
- [ ] Volgt "toon potentieel"-toggle

---

## Stap 8 — Beheer: management-gebruiker aanmaken

- [ ] Rol `management` toevoegen aan `ROLLEN` array in `Beheer.jsx`
- [ ] `ROL_LABELS` uitbreiden: `management: 'Management'`

---

## Stap 9 — Testen

- [ ] Management-gebruiker aanmaken via Beheer-tab
- [ ] Inloggen als management: alleen Planning (read), Overzicht (read), Projecten (read),
      Monteurs (read), Prognose (CRUD) zichtbaar
- [ ] Prognose-project aanmaken (potentieel)
- [ ] Status wijzigen naar in_opdracht → operationeel project verschijnt in Projecten-tab
- [ ] Planner kan prognose-tab niet zien
- [ ] Totaalregel klopt bij filter en toggle

---

## Bewust uitgesteld

- Bezetting per week (`prognose_bezetting` subtabel) — schema al gedocumenteerd in CONTEXT.md
- Monteurs-getal in cellen + monteurs-totaalregel (volgt na `prognose_bezetting`)
- Synchronisatie van velden tussen prognose en operationeel project na koppeling
- Margeberekening, kostprijs per mandag
- Vergelijking raming vs. werkelijke planning
- Automatische gat-signalering
- Export PDF/Excel
- Referentielijn beschikbare capaciteit
- Mobiele weergave Prognose
