# URL-routing refactor — React Router

## Waarom

De app gebruikt momenteel React state voor navigatie (`activeTab` in App.jsx). Alle pagina's draaien op één URL. Dit geeft problemen bij:
- **F5 / vernieuwen** → altijd terug naar Planning
- **Deep links** → niet mogelijk (link naar specifieke tab, week of project)
- **Bookmarken** → werkt niet
- **Browser back/forward** → werkt niet
- **Multi-tenant uitrol** → klanten verwachten standaard browser-navigatie

De correcte oplossing is URL-routing met `react-router-dom`. localStorage is een lapmiddel.

---

## Wat er verandert

### URL-structuur (voorstel)
```
/                    → redirect naar /planning
/planning            → Planning tab
/overzicht           → Overzicht tab
/projecten           → Projecten tab
/monteurs            → Monteurs tab
/prognose            → Prognose tab
/beheer              → Beheer tab
/statistieken        → Statistieken tab
```

### Bestanden die wijzigen
| Bestand | Wat |
|---|---|
| `package.json` | `react-router-dom` toevoegen |
| `main.jsx` | `<BrowserRouter>` wrapper |
| `App.jsx` | `useState activeTab` → `<Routes>` + `<Route>` per tab |
| Alle tab-componenten | `onNavigate` prop vervalt waar mogelijk |
| `App.jsx` navigeerNaar() | Vervangen door `useNavigate()` |
| Vercel | `vercel.json` toevoegen met rewrite regel (SPA fallback) |

---

## Aandachtspunten

- **Rolbeveiliging per route**: onbevoegde route → redirect naar eerste toegestane tab
- **Vercel SPA-fallback**: zonder `vercel.json` geeft directe URL's een 404
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Deep links naar specifieke week in Planning/Prognose**: optioneel, maar waardevol
  bijv. `/planning?week=2025-W35` of `/prognose?van=2025-W27`
- **Uitloggen**: na uitloggen redirect naar `/login` of `/`
- **Hamburger mobiel**: `navigeerNaar()` vervangen door `<Link>` of `useNavigate()`

---

## Fasering (aanbevolen)

**Fase 1 — Basisrouting (minimaal, laagste risico)**
Alleen tabs krijgen een URL. Geen query params, geen deep links. Duurt ~3-4 uur.

**Fase 2 — Deep links**
`/planning?week=...` en `/prognose?van=...` zodat je een specifieke periode kunt linken of bookmarken. Nuttig bij multi-tenant en klantcommunicatie.

**Fase 3 — Project deep links**
`/projecten/:id` voor directe link naar een project. Vergt aanpassingen in modals.

---

## Wanneer oppakken

Bij de volgende grotere refactor-sprint, of zodra de app commercieel uitgerold wordt naar meerdere tenants. Niet als tussentijdse hotfix — dit is een bewuste sprint op zichzelf.

---

## Risico's

| Risico | Mitigatie |
|---|---|
| Vercel 404 op directe URL's | `vercel.json` rewrite toevoegen vóór deploy |
| Rolbeveiliging omzeild via URL | Route-guard component die rol checkt vóór render |
| `onNavigate` prop overal doorgegeven | Stap voor stap vervangen, niet alles tegelijk |

---

## Uitvoeringsplan (Fase 1 — Basisrouting)

Uitgangspunten: werk op een aparte branch (productie/master blijft
onaangeraakt tot de laatste stap), elke stap lokaal getest vóór de
volgende begint, laatste stap vóór merge is een Vercel *preview*-deploy
(niet productie) om het enige risico te testen dat lokaal niet zichtbaar
is (de SPA-rewrite).

Gecheckt in de huidige code — dit is de exacte impact-omvang:
- `App.jsx`: `activeTab`-state, `navigeerNaar()`, 4 losse
  `onClick={() => navigeerNaar(...)}`-aanroepen (tenant-naam desktop/mobiel,
  desktop-tabs-loop, mobiel hamburger-menu-loop), `ActivePage`-lookup,
  en twee plekken die op `activeTab`-waarde zelf leunen (HandleidingModal
  `openSectie`, en de `<main>` className/style-logica voor projecten/monteurs).
- `Planning.jsx`: enige pagina die de `onNavigate`-prop echt gebruikt
  (1 plek, regel 901 — "naar projecten"-link vanuit een modal).
  Alle overige pagina's ontvangen de prop maar gebruiken hem niet.

### Stap 0 — Branch
- [x] Branch `feature/routing` vanaf `master`. Niets hierna raakt
      productie totdat er expliciet gemerged én gepusht wordt.

### Stap 1 — Dependency, geen gedragswijziging
- [x] `npm install react-router-dom` — 0 nieuwe vulnerabilities (de 4
      gerapporteerde zitten in bestaande build-tooling: @babel/core,
      brace-expansion, vite, ws — niet in react-router-dom zelf).
- [x] `<BrowserRouter>` om de app in `main.jsx`
- [x] Geverifieerd: `npm run build` + `npm run lint` — geen nieuwe issues
      t.o.v. master. Dev-server gestart en `main.jsx` via curl opgevraagd:
      compileert schoon, `react-router-dom`-import resolved correct
      (200, geen Vite-foutoverlay). App.jsx gebruikt de router nog
      nergens, dus functioneel een no-op.
- [x] Commit (`651671a`).

### Stap 2 — Route-guard component (nieuw, geïsoleerd)
- [x] `src/components/RouteGuard.jsx`: checkt rol tegen de toegestane
      rollen van een route, redirect naar een meegegeven fallback-pad
      bij onbevoegde toegang.
- [x] Build + lint schoon. Nog niet functioneel testbaar — component
      wordt pas in stap 3 in App.jsx ingehaakt.
- [x] Commit (`72b3914`).

### Stap 3 — App.jsx omzetten (kernstap, grootste risico)
- [ ] `activeTab`-state vervangen door `<Routes>`/`<Route>` per tab,
      elke rol-beperkte tab gewrapt in `RouteGuard`.
- [ ] `navigeerNaar()` → `useNavigate()`; alle 4 `onClick`-aanroepen
      + de `onNaarProjecten`-call in `Planning.jsx` aangepast.
- [ ] `HandleidingModal openSectie` en de `<main>`-className/style-logica
      omgezet naar `useLocation()` i.p.v. `activeTab`.
- [ ] Lokaal uitgebreid testen (`npm run dev`): elke tab, elke rol
      (admin/planner/gebruiker/management), hamburger-menu mobiel,
      "naar projecten"-link vanuit Planning-modal, uitloggen/inloggen.
      Let op: dit test nog NIET het Vercel-rewrite-risico — Vite's
      dev-server doet SPA-fallback altijd automatisch.
- [ ] Commit.

### Stap 4 — vercel.json
- [ ] SPA-fallback rewrite toevoegen. Heeft geen enkel effect vóór
      deploy — veilig om nu al mee te nemen.
- [ ] Commit.

### Stap 5 — Productie-achtige lokale build
- [ ] `npm run build` + `npm run preview` — test tegen een echte build
      i.p.v. de dev-server, als extra check vóór de eerste deploy.

### Stap 6 — Vercel preview-deploy (nog steeds geen productie)
- [ ] Branch pushen naar GitHub (niet naar `master`). Vercel maakt
      automatisch een Preview Deployment op een tijdelijke URL.
- [ ] Op die preview-URL specifiek testen: direct een niet-Planning-pad
      intypen (bv. `/prognose`) én verversen. Dit is het enige scenario
      dat zonder de `vercel.json`-rewrite 404 geeft, en het enige
      moment in dit hele plan dat dat risico echt zichtbaar wordt.

### Stap 7 — Merge + push naar master (de enige productie-raakvlak-stap)
- [ ] Pas uitvoeren als stap 6 volledig goed is. Dit is de "korte
      deploy" — Vercel deployt automatisch bij de push naar `master`.

### Stap 8 — Directe check ná deploy
- [ ] Meteen na de deploy: alle tabs, refresh op een niet-Planning-tab,
      mobiel hamburger-menu, uitloggen/inloggen-redirect — op de
      echte productie-URL (`planning.byggr.nl`).

---

## Rollback-strategie

| Situatie | Actie | Snelheid |
|---|---|---|
| Iets klopt niet vóór stap 7 (op de branch) | Niets — branch raakt master nooit aan. Branch aanpassen of weggooien. | Direct, geen risico |
| Iets klopt niet ná stap 7, net gedeployed | Vercel-dashboard → vorige deployment (van vóór de merge) met één klik "Promoten naar Productie". Geen git-actie nodig. | Seconden |
| Probleem dieper/later ontdekt | `git revert` op de merge-commit, opnieuw pushen. | Minuten |

Het meeste risico zit dus puur tussen stap 7 en stap 8 — daarvóór is
alles vrijblijvend op de branch, en zelfs ná de deploy is de terugweg
één klik in Vercel, geen noodprocedure.
