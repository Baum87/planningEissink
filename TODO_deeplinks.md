# Deep links — periode in de URL (Fase 2 van de routing-refactor)

## Waarom

Sinds de routing-refactor (Fase 1, zie CONTEXT.md sectie "Routing") heeft
elk tabblad een eigen URL, maar de bekeken periode/week ​*binnen*​ een
tabblad zit nog in losse React-state, niet in de URL. Concreet probleem:
`startDatum` in zowel `Prognose.jsx` als `Planning.jsx` wordt bij elke
fresh mount opnieuw berekend als "vandaag" — een refresh (F5) ná het
navigeren naar bv. drie maanden vooruit springt dus terug naar de huidige
week. Dat bestond al vóór Fase 1 en wordt er niet door opgelost.

Bijkomend voordeel: een specifieke periode is straks ook deelbaar/
bookmarkbaar (`/prognose?van=2026-09-07`), nuttig bij klantcommunicatie
zodra er een tweede tenant bijkomt.

## Scope — bewust klein gehouden

Alleen `startDatum` naar de URL, voor `Prognose.jsx` en `Planning.jsx`.
**Niet** meegenomen (zou scope-uitbreiding zijn, lost het gestelde
probleem niet extra op):
- Overige filter-state in Planning.jsx (weekend tonen, expertise-filter,
  PL-filter, project-filter, "alleen ingepland") — blijft gewoon state.
- Geen aparte branch/preview-deploy-traject zoals bij Fase 1 — risico is
  hiervoor te klein (geen Vercel-config nodig, query-params vallen al
  binnen de bestaande routes; geen nieuwe rolbeveiliging-vraagstukken).

## Impact — concreet, huidige call-sites

**Prognose.jsx** (3 plekken):
- Regel 87: `useState`-initializer (`vandaag - 14 dagen`)
- Regel 219: `setStartDatum` in de navigatiefunctie
- Regel 422: "Vandaag"-knop

**Planning.jsx** (4 plekken):
- Regel 74: `useState`-initializer (`getMaandag(new Date())`)
- Regel 466: vorige-knop (desktop `plusDagen` / mobiel `plusWerkdagen`)
- Regel 472: "Vandaag"-knop
- Regel 485: volgende-knop (zelfde mobiel/desktop-onderscheid)

## Stappenplan

- [x] **Prognose.jsx**: `useState` voor `startDatum` vervangen door
      `useSearchParams()` — lezen via `searchParams.get('van')`
      (formaat: `naarStr()`-output, bv. `2026-09-07`), parsen naar Date
      met fallback naar de huidige default (`vandaag - 14 dagen`) als de
      param ontbreekt of ongeldig is. Schrijven via `setSearchParams`
      (met `{ replace: true }` zodat elke week-stap niet de hele
      browser-historie volspam). "Vandaag" verwijdert de param i.p.v.
      een vaste datum te zetten, zodat een bookmark altijd de actuele
      week toont, ook weken later. Commit `f1e04ac`.
- [x] **Planning.jsx**: zelfde patroon, met behoud van de
      mobiel/desktop-tak (`plusWerkdagen` vs `plusDagen`) in de
      vorige/volgende-knoppen. Commit `1848b4a`.
- [x] **Correctheidsbug gevonden en gefixt** (bij herbeoordeling, niet in
      de oorspronkelijke scope voorzien): de nieuwe datum werd in beide
      bestanden berekend op basis van de buitenste `startDatum`-closure
      i.p.v. de meest actuele URL-staat — bij snel dubbelklikken op
      vorige/volgende kon een stap stilzwijgend verdwijnen (de oude
      `setStartDatum((d) => ...)`-vorm garandeerde dit wel, de eerste
      versie van deze wijziging niet). Opgelost door de berekening
      binnen de `setSearchParams`-updater te doen, op basis van `prev`.
      Gedeelde `parseVanParam()`-helper toegevoegd in beide bestanden om
      de fallback-logica niet dubbel te hebben. Commit `1848b4a`.
- [x] **Lokaal getest door gebruiker** (beide pagina's): navigeren zet
      `?van=` in de URL, refresh behoudt de periode, "Vandaag" verwijdert
      de param, en — na de fix — snel herhaald klikken op vorige/volgende
      telt elke klik correct.
- [x] Build + lint gecontroleerd — geen nieuwe issues t.o.v. baseline.
- [x] Commit (per stap apart, zie hierboven).

**Fase 2 is hiermee afgerond.**

## Risico's — definitieve stand

Laag risico bevestigd: geen Vercel/deploy-impact (query-strings hebben
geen server-side rewrite nodig, dus geen aparte branch/preview-traject
zoals bij Fase 1 nodig geweest). De `useMemo`-ketens die op `startDatum`
leunen (`weken` in Prognose.jsx, `alleDagen`/`zDagen` in Planning.jsx)
blijven correct gememoized doordat `startDatum` zelf nu ook via een eigen
`useMemo` (op de rauwe string-param) een stabiele referentie krijgt.
