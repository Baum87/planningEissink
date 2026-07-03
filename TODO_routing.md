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
