# Planning App — TODO

Prioriteiten gebaseerd op risico, juridische vereisten en gebruikerswaarde.
Bijgehouden naast CONTEXT.md — technische context staat daar.

---

## Direct — deze week

- [ ] **KvK-nummer invullen in verwerkersovereenkomst**
      docs/verwerkersovereenkomst.md — regel 8. Nog geen KvK aangevraagd.

- [x] **Migratie 011 uitvoeren in Supabase (profielen zonder login)**
      011_profielen_zonder_login.sql uitgevoerd. Validatie: 5 profielen, 5 met loginaccount, 0 zonder. ✓

- [x] **Beheer UI: projectleider aanmaken zonder loginaccount**
      "Persoon toevoegen" knop live. Tabel toont voornaam/achternaam/afkorting apart.
      "Koppel account" knop: via uitnodiging of direct aanmaken met wachtwoord.
      Personen zonder account zijn klikbaar en bewerkbaar.

- [ ] **Projectleiders aanmaken + data migratie**
      Volledige namen van 8 PLs ophalen bij beheerder Eissink (MB, GB, TJ, EK, RW, JH, JB, TP).
      Aanmaken via "Persoon toevoegen" in Beheer tab.
      Daarna koppelscript draaien: projectleider_initialen → projectleider_id (UUID).

---

## Voor eerste betalende klant

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

- [ ] **TenantContext: foutmelding tonen bij laad-fout**
      Bij een fout in laadTenant() wordt de fout nu geswallowed via console.error.
      Gebruiker ziet niets — fout naar UI doorgeven via een error-state.

- [ ] **Audit log triggers**
      Tabel bestaat al, wordt nog niet gevuld.
      Triggers toevoegen op projecten, monteurs, toewijzingen.

- [ ] **Smoke test stap 2 en 3 uitvoeren**
      Na volgende RLS-migratie: planner en gebruiker-rol testen via rls_smoke_test.sql.

- [ ] **React Query of SWR introduceren**
      Caching en optimistic updates — merkbaar voordeel voor planner bij snelle acties.

---

## Code kwaliteit — restant

- [ ] **Request cancellation via AbortController**
      Snelle weeknavigatie verstuurt meerdere fetch-requests tegelijk.
      Laatste response wint — kan stale data tonen. AbortController lost dit op.

- [ ] **Debounce zoekbalken**
      Elke toetsaanslag filtert direct over alle rijen. `useDeferredValue` of 200ms debounce
      voorkomt geblokkeerde frames bij grote datasets.

- [ ] **`getProjecten` / `getProjectenMetStats` samenvoegen**
      Twee bijna-identieke service-functies. Één functie met parameter `metStats = false`.

---

## Later

- [ ] **Drag-and-drop via dnd-kit**
      Grootste UX-verbetering voor Planner. CSS-structuur planning.jsx al rekening mee houden.

- [ ] **Mobile — monteur-view**
      Monteurs zijn potentiële gebruikersgroep (174 personen).
      Begin met lees-only view voor eigen toewijzingen.

- [ ] **Uptime monitoring**
      Bijv. UptimeRobot (free) — melding als app down is.

- [ ] **Custom domain: app.byggr.nl**
      Vercel custom domain instellen.

- [ ] **Supabase Pro upgrade**
      Bij eerste betalende klant: dagelijkse backups, geen pauzering, PITR.

- [ ] **Automatische backup oplossing**
      Huidige CSV-export is handwerk en foutgevoelig. Opties onderzoeken:
      - Supabase Pro ($25/maand) — dagelijkse backups + PITR
      - pg_dump via GitHub Actions (gratis, scheduled nightly backup naar repo of S3)
      - Supabase CLI op thuispc instellen voor snelle dumps vóór migraties

- [ ] **Performance: tvVoorDag optimaliseren**
      Geneste Map monteur_id → datum → [tv] i.p.v. live filter per cel.
      Pas aanpakken als de planning merkbaar traag wordt.

- [ ] **Archiveringsstrategie toewijzingen**
      Bij 500 projecten/jaar groeit de tabel snel.
      Overwegen: oude toewijzingen archiveren na X jaar.

- [ ] **Query monitoring**
      Supabase dashboard → Logs → Slow queries bijhouden bij groei.

- [ ] **Demo-omgeving**
      Aparte tenant met seed data voor sales-demo's aan potentiële klanten.

- [ ] **Realtime samenwerking (Supabase Realtime)**
      Meerdere planners tegelijk — nog niet nodig voor Eissink.

- [ ] **ERP-koppeling via extern_id**
      Webhook patroon via Edge Functions. extern_id staat al in datamodel.

---

## Bewust buiten scope (v1)

- Drag-and-drop (architectuur is er klaar voor)
- Unit / integratietests / E2E (1 klant, 3 gebruikers — overkill nu)
- CI/CD pipeline met automatische checks
- PWA / offline support
- Prijsbepaling en factuurstroom (commerciële beslissing, niet code)
- Wireframes / mockups (jij bent enige bouwer)

---

## Afgehandeld

### Nu — uitgevoerd

- [x] **Eigen SMTP instellen (Resend + Zoho)**
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

### Voor eerste betalende klant — uitgevoerd

- [x] **AVG — verwerkersovereenkomst**
      Juridisch verplicht zodra je persoonsgegevens van anderen verwerkt.
      Supabase datacenter: Londen UK (adequaatheidsbesluit EU — toegestaan).
      Sjabloon: docs/verwerkersovereenkomst.md — per klant ondertekenen.
      Privacyverklaring: docs/privacyverklaring.md + link op login-pagina.
      Aanbeveling: migreer naar Frankfurt bij Supabase Pro upgrade.

- [x] **Gebruikersbeheer via Edge Function + scherm**
      Geïmplementeerd: Edge Function + Beheer.jsx pagina voor admins.

### Kort daarna — uitgevoerd

- [x] **UNIQUE constraint op afkorting per tenant**
      `alter table profielen add constraint afkorting_unique_per_tenant unique(tenant_id, afkorting);`

- [x] **Bestaande gebruikers: afkorting toevoegen aan app_metadata**
      Uitgevoerd voor remco@baumeister.nl (RB) en initialen veld opgeruimd.

### Code kwaliteit laag 1 — uitgevoerd

- [x] **Duplicate `naarStr` verwijderen**
      Staat zowel in `datum.js` als in `toewijzingenService.js`. Import de versie uit datum.js.

- [x] **Timezone-bug in `getMonteurs` fixen**
      `new Date().toISOString().split('T')[0]` geeft UTC-datum → verkeerd na middernacht in NL.
      Vervangen door `naarStr(new Date())`.

- [x] **Dead code `skipDagen` verwijderen uit Planning.jsx**

- [x] **Date utilities verplaatsen uit Planning.jsx naar datum.js**
      `prevWerkdag`, `nextWerkdag`, `plusWerkdagen`, `fBereikLang`, `aaneengesloten`.

- [x] **TenantContext: sequentiële fetches → parallel (Promise.all)**

- [x] **`setGroepLeden` atomair maken**

- [x] **`getMonteurs`: vandaag-toewijzingen optioneel maken**

- [~] **`avatarKleur` hash: volledige naam i.p.v. eerste teken** *(bewust overgeslagen)*

### Code kwaliteit laag 2 — uitgevoerd

- [x] **`useAsyncData` custom hook**

- [x] **Modals uit Planning.jsx extraheren naar `src/components/`**

- [x] **`alert()` vervangen door inline fout-state in modals**

- [x] **`getTenantId()` cachen**

- [x] **`laad()` in Planning.jsx: bewaar `uitgeklapt` bij data-refresh**

### Code kwaliteit laag 3 — uitgevoerd

- [x] **`naam` normaliseren in AuthContext**
