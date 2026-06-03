# Planning App — TODO

Prioriteiten gebaseerd op risico, juridische vereisten en gebruikerswaarde.
Bijgehouden naast CONTEXT.md — technische context staat daar.

---

## Code kwaliteit — laag 1: bugs & dead code

Kleine, veilige wijzigingen. Na elk punt lokaal testen.

- [x] **Duplicate `naarStr` verwijderen**
      Staat zowel in `datum.js` als in `toewijzingenService.js`. Import de versie uit datum.js.

- [x] **Timezone-bug in `getMonteurs` fixen**
      `new Date().toISOString().split('T')[0]` geeft UTC-datum → verkeerd na middernacht in NL.
      Vervangen door `naarStr(new Date())` (lokale methoden, consistent met rest van codebase).

- [x] **Dead code `skipDagen` verwijderen uit Planning.jsx**
      `skipDagen` = hardSkipDagen ∪ softSkipDagen, maar wordt nergens gebruikt.
      Alleen `hardSkipDagen` wordt doorgegeven aan `createToewijzing`. Verwijderen.

- [x] **Date utilities verplaatsen uit Planning.jsx naar datum.js**
      `prevWerkdag`, `nextWerkdag`, `plusWerkdagen`, `fBereikLang`, `aaneengesloten` horen in datum.js.
      Nu onvindbaar en niet herbruikbaar vanuit andere pagina's.

- [x] **TenantContext: sequentiële fetches → parallel (Promise.all)**
      `laadTenant()` wacht eerst op tenant, dan op instellingen. Kan tegelijk.
      Twee onafhankelijke queries, ~2× sneller bij trage verbinding.

- [~] **`avatarKleur` hash: volledige naam i.p.v. eerste teken** *(bewust overgeslagen)*
      `naam.charCodeAt(0)` → "Jan", "Johan", "Joost" krijgen allemaal dezelfde kleur.
      Vervangen door hash over de volledige naam.

- [x] **`setGroepLeden` atomair maken**
      Delete + insert in twee losse queries: als insert faalt zijn leden weg zonder herstel.
      Oplossing: upsert-patroon of delete-only-na-succesvolle-insert.

- [x] **`getMonteurs`: vandaag-toewijzingen optioneel maken**
      Planning.jsx roept `getMonteurs()` aan maar gebruikt `toewijzingen_vandaag` nooit.
      Parameter toevoegen: `getMonteurs({ metVandaag = true } = {})` — Planning geeft `false`.

---

## Code kwaliteit — laag 2: extractie & consistentie

- [ ] **`useAsyncData` custom hook**
      Het laad/loading/error/useEffect-patroon staat 5× gekopieerd (Planning, Overzicht,
      Projecten, Monteurs, Beheer). Eén generieke hook elimineert dit.

- [ ] **Modals uit Planning.jsx extraheren naar `src/components/`**
      `InplanModal`, `ProjectZoeker`, `MonteurPopup` zijn nu gedefinieerd ín Planning.jsx
      en daardoor niet herbruikbaar. Verplaatsen naar losse bestanden.

- [ ] **`alert()` vervangen door inline fout-state in modals**
      `alert('Verwijderen mislukt: ' + err.message)` blokkeert de UI.
      Consistent maken met het patroon in Projecten.jsx (`fout`-state in modal).

- [ ] **`getTenantId()` cachen**
      Elke mutatie roept `getSession()` aan om tenant_id op te halen.
      Tenant-id is stabiel na login — eenmalig in geheugen bewaren.

- [ ] **`laad()` in Planning.jsx: bewaar `uitgeklapt` bij data-refresh**
      `setUitgeklapt(new Set(g.map(...)))` klapt bij elke refresh alle groepen open.
      Alleen initialiseren als `uitgeklapt` nog leeg is.

---

## Code kwaliteit — laag 3: performance (bij groei)

- [ ] **Request cancellation via AbortController**
      Snelle weeknavigatie verstuurt meerdere fetch-requests tegelijk.
      Laatste response wint — kan stale data tonen. AbortController lost dit op.

- [ ] **Debounce zoekbalken**
      Elke toetsaanslag filtert direct over alle rijen. `useDeferredValue` of 200ms debounce
      voorkomt geblokkeerde frames bij grote datasets.

- [ ] **`getProjecten` / `getProjectenMetStats` samenvoegen**
      Twee bijna-identieke service-functies. Één functie met parameter `metStats = false`.

- [ ] **`naam` normaliseren in AuthContext**
      `user?.app_metadata?.naam` wordt direct in App.jsx aangesproken buiten de context om.
      AuthContext exporteert al `initialen` — `naam` toevoegen zodat metadata-structuur
      op één plek zit.

---

## Nu — direct aanpakken

- [x] **Eigen SMTP instellen (Resend of Zoho)**
      Resend gekoppeld via smtp.resend.com, verstuurt vanaf noreply@byggr.nl.
      Zoho ingesteld als zakelijke inbox op hello@byggr.nl.
      DNS geconfigureerd via Cloudflare (MX, SPF, DKIM, DMARC). ✓ uitgevoerd op 18 mei 2026.

- [x] **Supabase max_rows ophogen naar 5000**
      planning_app → Project Settings → API → Max Rows ✓ uitgevoerd

- [x] **Backup strategie gedocumenteerd**
      Zie BACKUP_STRATEGIE.md. Voorlopig: handmatige CSV-export vóór elke migratie.

- [x] **Foutlogging via Sentry (free tier)**
      @sentry/react geïnstalleerd, DSN in .env.local en Vercel ingesteld.

- [x] **Wachtwoord reset flow testen**
      Getest en werkt correct.

---

## Morgen

- [ ] **Projectleiders aanmaken als gebruiker + data migratie**
      8 projectleiders (MB, GB, TJ, EK, RW, JH, JB, TP) uitnodigen via Beheer tab.
      Daarna migratiescript: projectleider_initialen → projectleider_id (UUID) per persoon.
      Vereiste: volledige namen + e-mailadressen van alle 8 ophalen bij de beheerder.

---

## Voor eerste betalende klant

- [ ] **AVG — verwerkersovereenkomst**
      Juridisch verplicht zodra je persoonsgegevens van anderen verwerkt.
      Supabase datacenter-locatie controleren voor AVG-compliance (EU vereist).

- [x] **Gebruikersbeheer via Edge Function + scherm**
      Geïmplementeerd: Edge Function + Beheer.jsx pagina voor admins.

- [ ] **Staging omgeving**
      Aparte Supabase project + Vercel preview branch zodat migraties
      en nieuwe features getest worden vóór productie.
      Nu gaan deploys direct naar de live app van de planner.

- [ ] **Validatie server-side controleren**
      Nagaan welke constraints er in het DB-schema zitten (NOT NULL, CHECK).
      Client-side validatie aanvullen waar server-side ontbreekt.

- [ ] **Gebruikersdocumentatie voor Planner en Gebruiker**
      Korte handleiding: inplannen, periodes, filters, wat ze kunnen en niet kunnen.

- [ ] **Onboarding documentatie voor nieuwe tenants**
      Stappenplan: Supabase setup, CSV-import, gebruikers aanmaken, expertises instellen.

---

## Kort daarna

- [ ] **Projectformulier: projectleider als dropdown op profielen**
      Vervangt tekstveld initialen. Vereist eerst gebruikersbeheer (profielen aangemaakt).

- [ ] **Planning filter: UUID-gebaseerd + auto-filter per rol bij login**
      Gebruiker ziet automatisch eigen projecten. Monteur ziet eigen rijen.
      Bouwt voort op projectformulier dropdown.

- [ ] **Audit log triggers**
      Tabel bestaat al, wordt nog niet gevuld.
      Triggers toevoegen op projecten, monteurs, toewijzingen.

- [ ] **React Query of SWR introduceren**
      Caching en optimistic updates — merkbaar voordeel voor planner bij snelle acties.

- [ ] **Smoke test stap 2 en 3 uitvoeren**
      Na volgende RLS-migratie: planner en gebruiker-rol testen via rls_smoke_test.sql.

- [ ] **UNIQUE constraint op afkorting per tenant**
      Twee gebruikers kunnen nu dezelfde afkorting krijgen (bijv. "JJ").
      `alter table profielen add constraint afkorting_unique_per_tenant unique(tenant_id, afkorting);`

- [ ] **TenantContext: foutmelding tonen bij laad-fout**
      Bij een fout in laadTenant() wordt de fout nu geswallowed via console.error.
      Gebruiker ziet niets — fout naar UI doorgeven via een error-state.

- [x] **Bestaande gebruikers: afkorting toevoegen aan app_metadata**
      Uitgevoerd voor remco@baumeister.nl (RB) en initialen veld opgeruimd.

---

## Later

- [ ] **Drag-and-drop via dnd-kit**
      Grootste UX-verbetering voor Planner. CSS-structuur planning.jsx al rekening mee houden.

- [ ] **Performance: tvVoorDag optimaliseren**
      Geneste Map monteur_id → datum → [tv] i.p.v. live filter per cel.
      Pas aanpakken als de planning merkbaar traag wordt.

- [ ] **Archiveringsstrategie toewijzingen**
      Bij 500 projecten/jaar groeit de tabel snel.
      Overwegen: oude toewijzingen archiveren na X jaar.

- [ ] **Mobile — monteur-view**
      Monteurs zijn potentiële gebruikersgroep (174 personen).
      Begin met lees-only view voor eigen toewijzingen.

- [ ] **Uptime monitoring**
      Bijv. UptimeRobot (free) — melding als app down is.

- [ ] **Query monitoring**
      Supabase dashboard → Logs → Slow queries bijhouden bij groei.

- [ ] **Demo-omgeving**
      Aparte tenant met seed data voor sales-demo's aan potentiële klanten.

- [ ] **Realtime samenwerking (Supabase Realtime)**
      Meerdere planners tegelijk — nog niet nodig voor Eissink.

- [ ] **ERP-koppeling via extern_id**
      Webhook patroon via Edge Functions. extern_id staat al in datamodel.

- [ ] **Custom domain: app.byggr.nl**
      Vercel custom domain instellen.

- [ ] **Supabase Pro upgrade**
      Bij eerste betalende klant: dagelijkse backups, geen pauzering, PITR.

- [ ] **Automatische backup oplossing**
      Huidige CSV-export is handwerk en foutgevoelig. Opties onderzoeken:
      - Supabase Pro ($25/maand) — dagelijkse backups + PITR
      - pg_dump via GitHub Actions (gratis, scheduled nightly backup naar repo of S3)
      - Supabase CLI op thuispc instellen voor snelle dumps vóór migraties

---

## Bewust buiten scope (v1)

- Drag-and-drop (architectuur is er klaar voor)
- Unit / integratietests / E2E (1 klant, 3 gebruikers — overkill nu)
- CI/CD pipeline met automatische checks
- PWA / offline support
- Prijsbepaling en factuurstroom (commerciële beslissing, niet code)
- Wireframes / mockups (jij bent enige bouwer)
