# Prognose-tijdlijn — bouwplan

Gebaseerd op de ontwerpbeslissingen in CONTEXT.md (sectie "Prognose-tijdlijn").
Volgorde is bewust: database eerst, dan service, dan UI.

---

## Stap 1 — Database (migratie 018)

- [ ] `prognose_config jsonb DEFAULT '{}'` kolom toevoegen aan `tenant_instellingen`
- [ ] Tabel `prognose_projecten` aanmaken:
  - id, tenant_id, naam, omschrijving, projectnummer
  - projectleider_id (nullable FK → profielen, ON DELETE SET NULL)
  - status ('potentieel' | 'in_opdracht', default 'potentieel')
  - status_gewijzigd_op (timestamptz, nullable)
  - aanneemsom (numeric 12,2, nullable)
  - start_datum (date — altijd maandag)
  - duur_weken (int, CHECK > 0)
  - bezetting_gemiddeld, bezetting_intern, bezetting_onderaannemer (numeric 5,1, allemaal nullable)
  - kleur (varchar 7, nullable)
  - operationeel_project_id (nullable FK → projecten, ON DELETE SET NULL)
  - created_at, updated_at
- [ ] RLS op `prognose_projecten`:
  - SELECT/INSERT/UPDATE/DELETE: `get_user_rol() IN ('admin', 'management') AND tenant_id = get_user_tenant_id()`
- [ ] Index op `(tenant_id, start_datum)` voor tijdlijn-queries
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

- [ ] `src/services/prognoseService.js`:
  - `getPrognoseProjecten(van, tot)` — haalt projecten op die de periode overlappen
  - `createPrognoseProject(velden)`
  - `updatePrognoseProject(id, velden)`
  - `deletePrognoseProject(id)`
  - `setInOpdracht(id)` — roept Edge Function aan
- [ ] `src/hooks/queries.js` uitbreiden:
  - `usePrognoseProjecten(van, tot)` — React Query hook

---

## Stap 4 — AuthContext

- [ ] Helper `isManagement(rol)` toevoegen: `rol === 'management'`
- [ ] Helper `kanPrognose(rol)` toevoegen: `rol === 'admin' || rol === 'management'`

---

## Stap 5 — App.jsx

- [ ] Tab toevoegen aan `ALLE_TABS`:
  `{ id: 'prognose', label: 'Prognose', component: Prognose, rollen: ['admin', 'management'] }`
- [ ] Import van `Prognose` pagina toevoegen

---

## Stap 6 — PrognoseModal.jsx

- [ ] Aanmaken-modus: startweek voorgevuld op aangeklikte cel
- [ ] Bewerkstand: bestaand prognose-project laden
- [ ] Velden:
  - naam (verplicht)
  - projectnummer
  - omschrijving
  - projectleider (dropdown op profielen — zelfde component/patroon als projectformulier)
  - status toggle (potentieel / in opdracht)
  - aanneemsom
  - startweek (weekkiezer — snap naar maandag via `getMaandag()`)
  - duur_weken (verplicht)
  - eindweek als readonly preview: `start_datum + duur_weken × 7`
  - bezetting_gemiddeld, bezetting_intern, bezetting_onderaannemer (alle optioneel)
  - kleurkiezer (hergebruik `minstGebruikteKleur()`)
- [ ] Statusovergang naar `in_opdracht`: bevestigingsscherm met uitleg
      ("Dit maakt automatisch een operationeel project aan voor de planner.")
- [ ] Verwijder-knop (met bevestiging) — verwijdert alleen prognose-record, niet het operationele project
- [ ] Inline fout-state (geen alert()) — zelfde patroon als InplanModal

---

## Stap 7 — Prognose.jsx (hoofdcomponent)

### Toolbar
- [ ] Navigatie ‹ Vandaag › — springt per 4 weken
- [ ] Periodeweergave label (bijv. "Wk 27 – Wk 52")
- [ ] Filter op groeperingssleutel (dropdown, gevuld vanuit unieke waarden in data)
- [ ] Toggle "Toon potentieel" aan/uit
- [ ] Toggle weergave: Financieel / Bezetting

### Tijdlijn grid
- [ ] Week-header — sticky top, 26 kolommen (~80–100px breed)
- [ ] Rijstructuur: groep-header-rij + prognose-project-subrijen
  - Groepering op `prognose_config.groepering_veld` (default: `projectleider_id`)
  - "Niet toegewezen"-groep voor projecten zonder projectleider
  - Groepen in- en uitklappen (zelfde patroon als Planning.jsx)
- [ ] Cel-rendering per week:
  - Project overlapt week → cel toont projectkleur via `projKleur()`
  - `potentieel` → gestreept (`repeating-linear-gradient(45deg, ...)` over de kleur)
  - `in_opdracht` → solide kleur
  - Geen tekst in de balk; details bij klik (PrognoseModal)
- [ ] Klik lege cel → PrognoseModal aanmaken, startweek voorgevuld
- [ ] Klik gevulde cel → PrognoseModal bewerken

### Totaalregel
- [ ] Sticky onderaan (`position: sticky; bottom: 0`)
- [ ] Per week optellen:
  - Financieel: aanneemsom ÷ duur_weken
  - Bezetting: gemiddeld / intern / onderaannemer
- [ ] Incomplete indicator als niet alle projecten bezetting hebben:
      "X fte (op basis van Y van Z projecten)"
- [ ] Volgt actief filter en "toon potentieel"-toggle

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

- Synchronisatie van velden tussen prognose en operationeel project na koppeling
- Margeberekening, kostprijs per mandag
- Vergelijking raming vs. werkelijke planning
- Automatische gat-signalering
- Export PDF/Excel
- Referentielijn beschikbare capaciteit
- Mobiele weergave Prognose
