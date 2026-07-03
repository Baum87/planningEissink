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
- [x] Smoke test uitbreiden in `rls_smoke_test.sql`:
  - planner kan prognose_projecten niet lezen
  - management kan toewijzingen niet schrijven
  - management kan prognose_projecten lezen en schrijven

---

## Stap 2 — Edge Function: prognose-in-opdracht

- [x] Nieuwe Edge Function `supabase/functions/prognose-in-opdracht/`
  - Ontvangt: `prognose_project_id`
  - Valideert: aanroeper is `admin` of `management`, zelfde tenant
  - Maakt record aan in `projecten` (service_role):
    `naam → omschrijving`, `projectnummer → werknummer`, `projectleider_id → projectleider_id`, `kleur → kleur`
  - Zet `operationeel_project_id` op het prognose-record
  - Zet `status = 'in_opdracht'` en `status_gewijzigd_op = now()`
  - Geeft het nieuwe `projecten`-record terug
- [x] Patroon volgen van bestaande `gebruikersbeheer` Edge Function (zelfde auth-header structuur)

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

- [x] Aanmaken-modus: startweek voorgevuld op aangeklikte cel
- [x] Bewerkstand: bestaand prognose-project laden
- [x] Veldvolgorde:
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
- [x] Statusovergang naar `in_opdracht`: bevestigingsscherm met uitleg
- [x] Verwijder-knop (met bevestiging) — verwijdert alleen prognose-record, niet het operationele project
- [x] Inline fout-state (geen alert()) — zelfde patroon als InplanModal

---

## Stap 7 — Prognose.jsx (hoofdcomponent)

### Toolbar
- [x] Navigatie ‹ Vandaag › — springt per 4 weken
- [x] Periodeweergave label (bijv. "Wk 27 – Wk 52 · 2025")
- [x] Toggle "Potentieel tonen" aan/uit
- [x] Knop "Nieuw project" rechts — opent PrognoseModal zonder voorgevulde cel

### Tijdlijn grid
- [x] Week-header — sticky top, 26 kolommen (~85px breed)
- [x] Rijstructuur: platte lijst gesorteerd op PL-initialen (afkorting), zonder-PL onderaan
- [x] Linkerkolom drie delen:
  - PL-kleurblokje met initialen via `avatarKleur(profielnaam)` (~40px)
  - Omschrijving (bold) + opdrachtgever (grijs, klein) — flex-1
  - Aanneemsom + duur in weken rechts (~100px)
- [x] Cel-rendering per week:
  - Project overlapt week → cel toont projectkleur via `projKleur()`
  - `potentieel` → gestreept (`repeating-linear-gradient(45deg, ...)` over de kleur)
  - `in_opdracht` → solide kleur
  - Geen tekst in de balk; details bij klik (PrognoseModal)
- [x] Klik lege cel → PrognoseModal aanmaken, startweek voorgevuld
- [x] Klik gevulde balk → PrognoseModal bewerken (startweek + duur aanpasbaar)

### Totaalregel
- [x] Sticky onderaan (`position: sticky; bottom: 0`)
- [x] Per week: som van aanneemsom ÷ duur_weken over alle zichtbare projecten
- [x] Volgt "toon potentieel"-toggle

---

## Stap 8 — Beheer: management-gebruiker aanmaken

- [x] Rol `management` toevoegen aan `ROLLEN` array in `Beheer.jsx`
- [x] `ROL_LABELS` uitbreiden: `management: 'Management'`

---

## Stap 9 — Testen

- [x] Management-gebruiker aanmaken via Beheer-tab
- [x] Inloggen als management: alleen Planning (read), Overzicht (read), Projecten (read),
      Monteurs (read), Prognose (CRUD) zichtbaar
- [x] Prognose-project aanmaken (potentieel)
- [x] Status wijzigen naar in_opdracht → operationeel project verschijnt in Projecten-tab
- [x] Planner kan prognose-tab niet zien
- [x] Totaalregel klopt bij filter en toggle

---

## V2 — na stabilisatie van v1

- [x] **Audit-trigger voor prognose_projecten (migratie 019)**
      `create trigger audit_prognose_projecten after insert or update or delete on public.prognose_projecten for each row execute function log_wijziging();`
      Functie bestaat al — één statement uitvoeren in Supabase SQL editor.


- [ ] **Prognose leesbaar voor planners**
      Planner ziet Prognose-tab in read-only — geen knoppen, geen klikbare cellen.
      Relevant zodat planners weten wat er aankomt. RLS hoeft niet aan te passen (SELECT is al open voor alle rollen via tenant check). Alleen `kanPrognose(rol)` aanvullen met read-only variant.


- [x] **Avatar-kleur opslaan per gebruiker** (migratie 020)
      `avatar_kleur varchar(7) nullable` toegevoegd aan `profielen`. Kleurkiezer in Beheer voor zowel gebruikers met als zonder account.
      `avatarKleur()` gebruikt opgeslagen kleur met hash als fallback. Beheer toont gekleurd bolletje per gebruiker.

- [x] **Prognose-projectkleur koppelen aan projectleider-kleur**
      Wanneer PL gekozen wordt in PrognoseModal → kleur-state springt automatisch naar PL's avatar_kleur.
      Gebruiker kan daarna nog handmatig overschrijven via de kleurkiezer.
      PROJECTLEIDER_SELECT uitgebreid met avatar_kleur. Projecten zonder PL gebruiken `minstGebruikteKleur()` als fallback.

- [x] **Drag op prognose-tijdlijn**
      Horizontaal slepen van een projectbalk verschuift `start_datum` (snap naar maandag).
      Raw pointer events — geen @dnd-kit nodig. Scroll-offset correct verrekend.
      Escape annuleert drag. Klik na drag opent geen modal.

- [x] **Duur inline aanpasbaar via chip in linkerkolom**
      Klik op `4w` chip → invoerveld met auto-select, Enter/blur slaat op, Escape annuleert.
      Resize-handle niet nodig — inline edit dekt de behoefte volledig.

---

## Morgen oppakken

- [x] **Vakanties en feestdagen tonen in prognose-tijdlijn**
      Bouwvak: bg-amber-100 in weekkop + bg-amber-50 in cellen, label "BOUWVAK". Feestdagen: blauw stipje + tooltip.
      Stijl consistent met Planning-sectie. Migratie 021 uitgevoerd op productie.

- [x] **Per project: loopt door in bouwvak (toggle)**
      Toggle in PrognoseModal. Toggle uit (default): duur_weken = werkweken, balk verdwijnt in bouwvak, einddatum schuift op.
      Toggle aan: kalenderweken, balk doorlopend. Drag snapt automatisch naar week na bouwvak. Migratie 021 uitgevoerd.

- [x] **Projecten zonder startdatum**
      start_datum en duur_weken optioneel (migratie 022). Projecten zonder datum verschijnen als rij zonder balk,
      gesorteerd op PL. Datum wissen in modal werkt. Migraties 021 + 022 uitgevoerd op productie.

---

## Bewust uitgesteld

- **Monteurs in cellen + totaalregel — Niveau 1 (aanbevolen)**
  `bezetting_gemiddeld` bestaat al in `prognose_projecten` maar is nog niet in de UI.
  Invoerveld toevoegen aan PrognoseModal. Getal tonen in balkcellen. Totaalregel sommeren per week.
  Geen migratie nodig. Geschikt voor projecten met stabiele bezetting.

- **Monteurs in cellen + totaalregel — Niveau 2 (complex)**
  Nieuwe `prognose_bezetting` subtabel: per project per week een monteurs_aantal.
  Vereist migratie, RLS, service en inline grid-editing per cel.
  Alleen zinvol als projecten sterk fluctuerende bezetting hebben.
- Synchronisatie van velden tussen prognose en operationeel project na koppeling
- Margeberekening, kostprijs per mandag
- Vergelijking raming vs. werkelijke planning
- Automatische gat-signalering
- Referentielijn beschikbare capaciteit
- Mobiele weergave Prognose
