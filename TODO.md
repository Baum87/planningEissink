# Planning App — TODO

Prioriteiten gebaseerd op risico, juridische vereisten en gebruikerswaarde.
Bijgehouden naast CONTEXT.md — technische context staat daar.

---

## Direct — deze week

- [ ] **KvK-nummer invullen in verwerkersovereenkomst**
      docs/verwerkersovereenkomst.md — regel 8. Nog geen KvK aangevraagd.

---

## Later

- [ ] **Statistieken: ziek/vrij projecten vertekenen het beeld**
      Momenteel worden "ziek" en "vrij" als gewone projecten aangemaakt. Toewijzingen aan deze
      projecten tellen mee in de statistieken als "ingepland", terwijl een zieke of vrije monteur
      juist níet productief inzetbaar is. Dit geeft een te rooskleurig beeld van de bezetting.
      Oplossing: voeg een `is_afwezigheid boolean` kolom toe aan de `projecten` tabel. Hiermee kun je:
      (1) afwezigheidsdagen uitsluiten van de productiviteitstelling,
      (2) ze optioneel als aparte grijze balk in de grafiek tonen (inzicht in verzuimpatronen).
      Kleine migratie + aanpassing in Beheer-UI om de vlag per project in te stellen.

- [ ] **Staging omgeving**
      Lokaal testen dekt de meeste risico's. Staging wordt relevant als Eissink dagelijks
      actief is én er grote migraties of een tweede developer bij komen.
      Opzet: apart Supabase project + Vercel preview branch.

- [ ] **Changelog tabblad in Beheer**
      De data wordt al bijgehouden in `src/lib/updates.js` — elke update die daar toegevoegd wordt
      blijft permanent bewaard. Wat ontbreekt is een UI om dit terug te lezen.
      Idee: extra tabblad in Beheer.jsx dat alle entries uit updates.js toont als tijdlijn,
      inclusief datum, titel, doelgroep (rollen) en omschrijving per item.
      Alleen zichtbaar voor Admin. Geen database nodig — alles komt uit het bestaande register.

- [ ] **UNIQUE constraint op toewijzingen — laag risico, hoge zekerheid**
      Situatie: er is geen unieke constraint op `(tenant_id, monteur_id, project_id, datum_van)`.
      Duplicaten kunnen theoretisch ontstaan bij drag & drop of toekomstige modal-wijzigen: als
      `createToewijzing` slaagt maar de daaropvolgende `deleteToewijzingenBulk` faalt (netwerk
      wegvalt in het raam van milliseconden), bestaat het project op de oude én nieuwe plek.
      Kans in de praktijk: zeer laag (<1%). Gevolgen: visuele cel-splitsing voor diezelfde dag,
      statistieken tellen die dag dubbel. Niet catastrofaal, maar stiekem — je merkt het pas als
      je goed kijkt. Oplossing is één migratie:
      `ALTER TABLE toewijzingen ADD CONSTRAINT uq_toewijzing_monteur_project_dag
       UNIQUE (tenant_id, monteur_id, project_id, datum_van);`
      Dit maakt het onmogelijk in plaats van onwaarschijnlijk. Aanraden vóór modal-wijzigen gebouwd wordt.

- [ ] **Mobile — monteur-view**
      Monteurs zijn potentiële gebruikersgroep (174 personen).
      Begin met lees-only view voor eigen toewijzingen.

- [ ] **Uptime monitoring**
      Bijv. UptimeRobot (free) — melding als app down is.

- [x] **Custom domain: planning.byggr.nl** ✓ live
      Vercel custom domain geconfigureerd en actief op planning.byggr.nl.

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

- [ ] **Realtime samenwerking (Supabase Realtime)**
      Meerdere planners tegelijk — nog niet nodig voor Eissink.
      Bij implementatie: `refetchInterval: 60_000` op toewijzingen-query in Planning.jsx verwijderen — Realtime vervangt de polling.

- [ ] **ERP-koppeling via extern_id**
      Webhook patroon via Edge Functions. extern_id staat al in datamodel.

- [ ] **Project deep links (`/projecten/:id`)**
      Pas relevant zodra ERP-koppeling wordt opgepakt — een extern systeem
      dat naar een specifiek project wil linken heeft een stabiele URL
      nodig. Vergt aanpassingen in hoe project-modals werken (nu geen
      eigen route per project). Geen zelfstandige waarde op dit moment.

### Prognose Planning

- [ ] **Prognose leesbaar voor planners**
      Planner ziet Prognose-tab in read-only — geen knoppen, geen klikbare cellen.
      RLS hoeft niet aan te passen. Alleen `kanPrognose(rol)` aanvullen met read-only variant.

- [ ] **Synchronisatie prognose ↔ operationeel project na koppeling**

- [ ] **Margeberekening en kostprijs per mandag**

- [ ] **Vergelijking raming vs. werkelijke planning**

- [ ] **Automatische gat-signalering**

- [ ] **Referentielijn beschikbare capaciteit**

- [ ] **Weeknummers in datumkiezer Prognose** *(optioneel)* — react-datepicker met `showWeekNumbers`. Alleen UI-wijziging in PrognoseModal.jsx, geen database- of servicelaag-impact.

---

## Bewust buiten scope (v1)

- Drag-and-drop uitgebreid (resize blokken, projectenpaneel links)
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

- [x] **Migratie 011 uitvoeren in Supabase (profielen zonder login)**
      011_profielen_zonder_login.sql uitgevoerd. Validatie: 5 profielen, 5 met loginaccount, 0 zonder. ✓

- [x] **Beheer UI: projectleider aanmaken zonder loginaccount**
      "Persoon toevoegen" knop live. Tabel toont voornaam/achternaam/afkorting apart.
      "Koppel account" knop: via uitnodiging of direct aanmaken met wachtwoord.
      Personen zonder account zijn klikbaar en bewerkbaar.

- [x] **Demo-omgeving**
      Aparte tenant "Demo Afbouw BV" met seed data (monteurs, projecten, expertises, groepen)
      voor sales-demo's aan potentiële klanten. Zie supabase/seed.sql. ✓

- [x] **Mobiele weergave Prognose**
      Responsieve grid (smallere kolommen, verborgen secundaire knoppen op mobiel) voldoende
      bevonden — geen aparte lijstweergave nodig. ✓

### Voor eerste betalende klant — uitgevoerd

- [x] **AVG — verwerkersovereenkomst**
      Juridisch verplicht zodra je persoonsgegevens van anderen verwerkt.
      Supabase datacenter: Londen UK (adequaatheidsbesluit EU — toegestaan).
      Sjabloon: docs/verwerkersovereenkomst.md — per klant ondertekenen.
      Privacyverklaring: docs/privacyverklaring.md + link op login-pagina.
      Aanbeveling: migreer naar Frankfurt bij Supabase Pro upgrade.

- [x] **Gebruikersbeheer via Edge Function + scherm**
      Geïmplementeerd: Edge Function + Beheer.jsx pagina voor admins.

- [x] **Validatie server-side controleren**
      Migratie 013: CHECK constraints toegevoegd op datum_volgorde in toewijzingen en periodes. ✓

- [x] **Gebruikersdocumentatie voor Planner en Gebruiker**
      docs/handleiding-gebruikers.md + info-icoon modal in de app. ✓

- [x] **Onboarding documentatie voor nieuwe tenants**
      docs/onboarding-nieuwe-tenant.md — 9 stappen incl. opleverchecklist. ✓

### Kort daarna — uitgevoerd

- [x] **TenantContext: foutmelding tonen bij laad-fout**
      Fout naar UI doorgeven via error-state. ✓

- [x] **Audit log triggers**
      Migratie 016: AFTER triggers op projecten, monteurs en toewijzingen. ✓

- [x] **Smoke test stap 2 en 3 uitvoeren**
      Alle 4 stappen doorlopen: anon geblokkeerd, planner/gebruiker correct, cross-tenant isolatie OK. ✓

- [x] **React Query introduceren**
      @tanstack/react-query geïnstalleerd. Gedeelde hooks in src/hooks/queries.js.
      Alle pagina's gemigreerd: Projecten, Monteurs, Overzicht, Planning, Beheer.
      useToewijzingen heeft refetchInterval 60s voor passieve gebruikers. ✓

- [x] **UNIQUE constraint op afkorting per tenant**
      `alter table profielen add constraint afkorting_unique_per_tenant unique(tenant_id, afkorting);`

- [x] **Bestaande gebruikers: afkorting toevoegen aan app_metadata**
      Uitgevoerd voor remco@baumeister.nl (RB) en initialen veld opgeruimd.

- [x] **Mobiele weergave Overzicht — gelijktrekken met Planning**
      3-daagse navigatie, compacte naamkolom, toolbar stabiel, naam/werknummer omgedraaid. ✓

- [x] **Mobiele weergave Beheer — knoppen analyseren**
      Knoppen wrappen nu op mobiel via flex-wrap. ✓

- [x] **Favicon per tenant instellen**
      logo_url uit tenants-tabel als favicon via TenantContext. Logo ook in desktop-header. ✓

- [x] **Debounce zoekbalken**
      useDeferredValue via gedeelde useZoek hook. Planning, Monteurs, Projecten, ProjectZoeker. ✓

- [x] **Zoekbaar ledenlijst in GroepModal**
      Select-dropdown vervangen door gefilterde scrollbare lijst met useZoek. ✓

- [x] **`getProjecten` / `getProjectenMetStats` samenvoegen**
      Was al gedaan — één functie met `metStats = false` parameter. ✓

### Code kwaliteit laag 1 — uitgevoerd

- [x] **Duplicate `naarStr` verwijderen**
- [x] **Timezone-bug in `getMonteurs` fixen**
- [x] **Dead code `skipDagen` verwijderen uit Planning.jsx**
- [x] **Date utilities verplaatsen uit Planning.jsx naar datum.js**
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

### Drag & drop — uitgevoerd

- [x] **Bestaande planningsblokken verslepen (datum + monteur)**
      dnd-kit geïnstalleerd. Blokken slepen naar andere dag of monteur. Hele aaneengesloten
      periode verplaatst mee. Create-before-delete volgorde beschermt data bij netwerkfouten.
      Klikgedrag (modal openen) ongewijzigd. Uitgeschakeld in 8-weken modus (cellen te smal). ✓

### Code kwaliteit laag 3 — uitgevoerd

- [x] **`naam` normaliseren in AuthContext**

### Projectleiders — uitgevoerd

- [x] **Projectleiders aanmaken + data migratie**
      Migratie 012: projectleider_initialen → projectleider_id (UUID). 168 projecten gekoppeld. ✓

- [x] **Projectformulier: projectleider als dropdown op profielen**
      Tekstveld vervangen door dropdown op profielen. ✓

- [x] **Planning filter: UUID-gebaseerd + auto-filter per rol bij login**
      Filters in Planning, Overzicht en Projecten werken op UUID. ✓
