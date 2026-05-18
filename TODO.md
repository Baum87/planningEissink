# Planning App — TODO

Prioriteiten gebaseerd op risico, juridische vereisten en gebruikerswaarde.
Bijgehouden naast CONTEXT.md — technische context staat daar.

---

## Nu — direct aanpakken

- [ ] **Eigen SMTP instellen (Resend of Zoho)**
      Supabase free tier: max 3 e-mails per uur — gedeeld door uitnodigingen,
      wachtwoord reset en e-mailbevestiging. Blokkeert bij normaal gebruik.
      Resend (aanbevolen): gratis tot 3.000/maand, eenvoudig te koppelen.
      Zoho: als je sowieso zakelijke e-mail (@byggr.nl) wilt instellen.
      → Uitstellen tot na testfase, maar dit is de eerste blocker bij meer gebruikers.

- [x] **Supabase max_rows ophogen naar 5000**
      planning_app → Project Settings → API → Max Rows ✓ uitgevoerd

- [ ] **Backup strategie**
      Zie BACKUP_STRATEGIE.md voor stappen en checklist.

- [ ] **Foutlogging via Sentry (free tier)**
      Gebruikers zien nu geen foutmelding als een query mislukt.
      Sentry free tier instellen zodat fouten zichtbaar zijn zonder dat Roy het hoeft te melden.
      → In progress: @sentry/react installeren + DSN instellen in .env

- [x] **Wachtwoord reset flow testen**
      Getest en werkt correct.

---

## Morgen

- [ ] **Projectleiders aanmaken als gebruiker + data migratie**
      8 projectleiders (MB, GB, TJ, EK, RW, JH, JB, TP) uitnodigen via Beheer tab.
      Daarna migratiescript: projectleider_initialen → projectleider_id (UUID) per persoon.
      Vereiste: volledige namen + e-mailadressen van alle 8 ophalen bij Roy.

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
      Nu gaan deploys direct naar de live app van Roy.

- [ ] **Validatie server-side controleren**
      Nagaan welke constraints er in het DB-schema zitten (NOT NULL, CHECK).
      Client-side validatie aanvullen waar server-side ontbreekt.

- [ ] **Gebruikersdocumentatie voor Roy en Martijn**
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
      Grootste UX-verbetering voor Roy. CSS-structuur planning.jsx al rekening mee houden.

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

---

## Bewust buiten scope (v1)

- Drag-and-drop (architectuur is er klaar voor)
- Unit / integratietests / E2E (1 klant, 3 gebruikers — overkill nu)
- CI/CD pipeline met automatische checks
- PWA / offline support
- Prijsbepaling en factuurstroom (commerciële beslissing, niet code)
- Wireframes / mockups (jij bent enige bouwer)
