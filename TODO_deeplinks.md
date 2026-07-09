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

- [ ] **Prognose.jsx**: `useState` voor `startDatum` vervangen door
      `useSearchParams()` — lezen via `searchParams.get('van')`
      (formaat: `naarStr()`-output, bv. `2026-09-07`), parsen naar Date
      met fallback naar de huidige default (`vandaag - 14 dagen`) als de
      param ontbreekt of ongeldig is. Schrijven via `setSearchParams`
      (met `{ replace: true }` zodat elke week-stap niet de hele
      browser-historie volspam).
- [ ] **Planning.jsx**: zelfde patroon, met aandacht voor de
      mobiel/desktop-tak in de vorige/volgende-knoppen.
- [ ] **Lokaal testen**: navigeren + verversen (moet dezelfde periode
      teruggeven), directe link met `?van=...` openen, back/forward,
      "Vandaag"-knop reset de URL correct, gedrag zonder query-param
      (moet nog steeds gewoon "vandaag" tonen — geen breaking change
      voor bestaande bookmarks/links zonder param).
- [ ] Build + lint controleren.
- [ ] Commit.

## Risico's

Laag. Geen Vercel/deploy-risico (query-strings hebben geen server-side
rewrite nodig). Belangrijkste aandachtspunt: de `useMemo`-ketens die al
op `startDatum` leunen (bv. `weken` in Prognose.jsx) blijven ongewijzigd
werken zolang `startDatum` maar hetzelfde Date-type blijft opleveren,
ongeacht of de bron nu state of URL is.
