# Prognose — Bezetting per week (stappenplan)

Doel: bezetting (aantal monteurs + optionele tekst, bv. team) zichtbaar en
bewerkbaar maken in de Prognose-tijdlijn, als vervanging van de losse
Excel-planning die daar nu voor gebruikt wordt.

Uitgangspunten uit het sparren (niet opnieuw ter discussie stellen):
- Twee niveaus: Niveau 1 = project-breed gemiddelde (bestaand veld,
  geen migratie). Niveau 2 = per-week override (nieuwe subtabel).
- Getal komt in élke week-cel te staan, subtiel, boven de gekleurde balk —
  niet alleen in de sticky infokolom.
- Zichtbaarheid via een toggle-knop, zelfde patroon als de bestaande
  "Weekbedrag"-toggle.
- Geen visueel onderscheid tussen "overgeërfd gemiddelde" en "bewuste
  weekoverride" — alles ziet er hetzelfde uit.
- Projecten zonder ingevulde waarde tonen niets (geen 0, geen placeholder).
- Tekstveld (team/opmerking) is optioneel per week, hoort bij Niveau 2,
  heeft geen Niveau-1-equivalent (geen "gemiddeld team").
- Totaalregel/som per week over bezetting: nog niet besloten, evalueren
  ná gebruik van Niveau 1+2. Niet nu bouwen.

---

## Niveau 1 — bezetting_gemiddeld activeren

Geen migratie: `bezetting_gemiddeld numeric(5,1)` bestaat al op
`prognose_projecten` (zie migratie 018), maar is nog niet invoerbaar en
wordt nergens getoond.

- [ ] **Invoerveld in PrognoseModal.jsx**
      Nieuw veld "Gemiddeld aantal monteurs" (number input, optioneel,
      analoog aan het bestaande Aanneemsom-veld qua styling). State +
      opnemen in `velden` object bij `handleOpslaan`.

- [ ] **Tonen in Prognose.jsx — week-cellen**
      Subtiele regel boven de bestaande gekleurde balk (binnen dezelfde
      week-cel), alleen als `project.bezetting_gemiddeld` niet null is
      én de week overlapt (`overlapt()` is al true). Kleine, gedempte
      tekststijl — vergelijkbaar met de bestaande weekbedrag-tekst
      (`fontSize: 9, color: rgba(0,0,0,0.5)`), maar op een eigen regel
      boven de balk i.p.v. erin.

- [ ] **Toggle-knop "Bezetting"**
      Nieuwe state `toonBezetting` naast bestaande `toonWeekbedrag`,
      zelfde toggle-component/stijl in de toolbar. Layer alleen renderen
      als toggle aan staat.

- [ ] **Rijhoogte aanpassen**
      `ROW_H` is nu een vaste constante (48). Extra regel boven de balk
      heeft ruimte nodig — reserveer dit alleen als `toonBezetting` aan
      staat (bv. `ROW_H = toonBezetting ? 60 : 48`), zodat de grid
      compact blijft zolang de laag uit staat. Header-rij en
      totaalregel-hoogte hoeven niet mee te schalen (geen bezetting-
      content daar in Niveau 1).

---

## Niveau 2 — per-week override (nieuwe subtabel)

- [ ] **Migratie `024_prognose_bezetting.sql`**
      Nieuwe tabel, zelfde RLS/audit-patroon als `prognose_projecten`
      (migraties 018 + 019). `week_offset` (relatief t.o.v.
      `start_datum` van het project) i.p.v. een absolute datum — zodat
      overrides automatisch meeschuiven als het project versleept
      wordt, zonder dat er ergens rijen herschreven hoeven te worden:
      ```
      prognose_bezetting
        id                    uuid primary key default gen_random_uuid()
        prognose_project_id   uuid not null references prognose_projecten(id) on delete cascade
        tenant_id             uuid not null references tenants(id) on delete cascade
        week_offset           int not null   -- 0 = startweek, 1 = week erna, etc.
        aantal_monteurs       int
        tekst                 text
        created_at            timestamptz default now()
        updated_at            timestamptz default now()
        unique (prognose_project_id, week_offset)
      ```
      - RLS: select/insert/update/delete, admin + management van eigen
        tenant (kopieer policies uit 018 1-op-1).
      - Audit-trigger `audit_prognose_bezetting` via bestaande
        `log_wijziging()`.
      - Grant select/insert/update/delete aan `authenticated`.
      - Index op `(tenant_id, prognose_project_id)`.

- [ ] **Service-laag in prognoseService.js**
      - `getPrognoseBezetting(projectIds)` — één query, gefilterd op
        `prognose_project_id in (...)`. Geen datumfilter nodig: de
        project-ids komen al uit de reeds opgehaalde `rijen`
        (`usePrognoseProjecten(van, tot)` filtert al op venster).
      - `upsertPrognoseBezetting(prognose_project_id, week_offset, velden)`
        — insert-of-update op de unique constraint.

- [ ] **Ophalen + lookup in Prognose.jsx**
      Nieuwe hook (`usePrognoseBezetting` in hooks/queries.js) parallel
      aan `usePrognoseProjecten`, gevoed met de project-ids uit `rijen`.
      Client-side omzetten naar een Map met key
      `` `${project_id}|${week_offset}` `` — zelfde patroon als
      `bouwvakWeekenSet`.

- [ ] **Cel-inhoud bepalen**
      Per cel eerst de offset berekenen t.o.v. het project:
      `Math.round((weekStart - project.start_datum) / (7 dagen))`.
      Toon override uit de Map voor die offset als die bestaat, anders
      `project.bezetting_gemiddeld` (Niveau 1) als fallback, anders
      niets. Tekstveld heeft geen fallback — alleen tonen als er een
      override met tekst is.

- [ ] **Klik-om-te-bewerken**
      Hergebruik de bestaande drag-detectie (`wasDragged` /
      `drag.weekDelta`): een `onPointerDown` + `onPointerUp` op een
      week-cel zonder beweging (`weekDelta === 0`) opent een klein
      inline-formuliertje voor die specifieke (project, week_offset) —
      twee velden: aantal monteurs (getal) + tekst, beide optioneel.
      Prefill: override-waarde indien aanwezig, anders het Niveau-1-
      gemiddelde als suggestie voor het getal (leeg voor tekst).
      Opslaan via `onBlur`/Enter, annuleren via Escape — zelfde
      patroon als de bestaande `editDuur`-chip.
      Belangrijk: dit mag de bestaande sleep-interactie (project
      verplaatsen) niet breken — alleen "klik zonder bewegen" triggert
      de editor, "klik + bewegen" blijft slepen.

- [ ] **Validatie**
      Testen: cel met alleen override-getal, cel met alleen tekst, cel
      met beide, cel zonder project.bezetting_gemiddeld én zonder
      override (moet leeg blijven), toggle aan/uit, slepen van een
      project met bestaande overrides (moet automatisch meeschuiven
      dankzij `week_offset` — expliciet handmatig testen om te
      bevestigen dat er geen edge case over het hoofd is gezien, met
      name rond bouwvak-weken bij niet-doorlopende projecten).

---

## Nazorg

- [ ] **CONTEXT.md bijwerken** — sectie "Toekomstige uitbreiding:
      bezetting per week" (regel ~301) vervangen door de daadwerkelijke
      implementatie, zodat het geen open TODO meer is.
- [ ] **TODO.md bijwerken** — "Monteurs in cellen + totaalregel — Niveau
      1 / Niveau 2" items afvinken of verwijderen.
