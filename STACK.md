# Diensten en tools — planning_app

Overzicht van alle externe diensten en interne tools die de app gebruiken.
Bijgehouden zodat duidelijk is wat alles doet, wat het kost, en wat er gebeurt als het wegvalt.

---

## Architectuurschema

```
  ONTWIKKELAAR
      │
      │  git push
      ▼
  ┌─────────┐
  │ GitHub  │──── trigger deploy ────▶ ┌─────────┐
  └─────────┘                          │  Vercel │
                                       │  (CDN)  │
                                       └────┬────┘
                                            │ levert React app
                                            ▼
                                      ┌───────────┐
                                      │  Browser  │  ◀── Gebruiker
                                      │ (React)   │
                                      └─────┬─────┘
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                   data + auth         fouten            (toekomst)
                          │                 │
                          ▼                 ▼
                   ┌────────────┐    ┌─────────┐
                   │  Supabase  │    │  Sentry │
                   │            │    └─────────┘
                   │ ┌────────┐ │
                   │ │  Auth  │ │
                   │ └───┬────┘ │
                   │     │ uitnodiging /
                   │     │ wachtwoord reset
                   │     ▼      │
                   │ ┌────────┐ │
                   │ │ Resend │ │──▶ noreply@byggr.nl ──▶ Gebruiker
                   │ └────────┘ │
                   │            │
                   │ ┌────────┐ │
                   │ │  RLS   │ │  (tenant-isolatie)
                   │ └────────┘ │
                   │            │
                   │ ┌────────┐ │
                   │ │  Edge  │ │  (gebruikersbeheer)
                   │ │  Func  │ │
                   │ └────────┘ │
                   └────────────┘
```

---

## Supabase

**Wat het is:** De backend van de app. Bevat de database, authenticatie en toegangsregels.

**Wat het doet:**
- Slaat alle data op: projecten, monteurs, toewijzingen, periodes, groepen, profielen, tenants
- Beheert inloggen (e-mail + wachtwoord via Supabase Auth)
- Bepaalt wie wat mag zien via RLS (Row Level Security) — elke tenant ziet alleen eigen data
- Biedt een REST API (PostgREST) waarmee de frontend data ophaalt en opslaat

**Waarom dit en niet iets anders:** Combineert database + auth + API in één dienst, PostgreSQL als fundament (robuust, bekend), gratis tier ruim voldoende voor huidige schaal.

**Invloed op de app:** Kritiek. Als Supabase down is, werkt de app niet — geen data, geen inloggen.

**Kosten:** Gratis (Free tier) — limieten:
- 500 MB database
- 50.000 actieve gebruikers/maand
- Geen automatische backups (alleen op Pro)
- Database pauzeert na 1 week inactiviteit (Free tier)

**Upgrade:** Pro = $25/maand — dagelijkse backups, geen pauzering, PITR. Aanraden bij eerste betalende klant.

**Projecten:**
- `planning_app` — live productie (Eissink)
- `qrnsjldoeobipqclpdxu` — oud archief, niet aanraken

---

## Vercel

**Wat het is:** De hostingdienst voor de frontend.

**Wat het doet:**
- Bouwt de React-app automatisch bij elke push naar `master` op GitHub
- Serveert de app wereldwijd via een CDN
- Beheert environment variables (zoals Supabase URL en Sentry DSN)
- Geeft gratis HTTPS en een `.vercel.app` domein

**Waarom dit:** Directe koppeling met GitHub, nul configuratie voor React + Vite, gratis voor kleine projecten.

**Invloed op de app:** Kritiek voor bereikbaarheid. Als Vercel down is, kunnen gebruikers de app niet laden. Data in Supabase blijft intact.

**Kosten:** Gratis (Hobby tier) — limieten:
- 100 GB bandbreedte/maand
- Onbeperkte deploys
- 1 concurrent build

**URL:** [planning-eissink.vercel.app](https://planning-eissink.vercel.app)

**Environment variables (hier instellen voor productie):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN`

---

## GitHub

**Wat het is:** Versiebeheer en opslagplaats voor de broncode.

**Wat het doet:**
- Bewaart de volledige geschiedenis van alle codewijzigingen
- Triggert automatisch een nieuwe Vercel-deploy bij elke push naar `master`
- Maakt samenwerking en terugdraaien van wijzigingen mogelijk

**Invloed op de app:** Niet direct — de gebouwde app draait op Vercel, onafhankelijk van GitHub. Wel kritiek voor ontwikkeling en deploys.

**Kosten:** Gratis voor publieke en kleine privérepo's.

**Repository:** github.com/Baum87/planningEissink

---

## Sentry

**Wat het is:** Foutmonitoring — een automatisch logboek van alles wat kapot gaat in de browser.

**Wat het doet:**
- Vangt JavaScript-fouten op in de browser van de gebruiker
- Stuurt foutmeldingen naar een dashboard met stacktrace, tijdstip en browserinfo
- Stuurt een e-mailnotificatie bij nieuwe fouten
- Fouten zijn zichtbaar zonder dat de gebruiker dit hoeft te melden

**Waarom dit:** Fouten verdwijnen normaal stil in de browser console. Zonder Sentry weet je alleen dat er iets stuk is als Roy belt.

**Invloed op de app:** Geen — Sentry is passief. Als Sentry down is, werkt de app gewoon door. Alleen de foutrapportage valt weg.

**Kosten:** Gratis (Free tier) — limieten:
- 5.000 errors per maand
- 1 teamlid
- 30 dagen geschiedenis

Bij overschrijding stopt Sentry met opslaan van nieuwe fouten tot de volgende maand. De app blijft gewoon werken.

**Dashboard:** sentry.io

**Configuratie:** `src/main.jsx` — alleen actief in productie (`enabled: import.meta.env.PROD`)

---

## Resend

**Wat het is:** Transactionele e-maildienst voor uitnodigingen en wachtwoord-resets.

**Wat het doet:**
- Verstuurt Supabase Auth-mails: uitnodigingen voor nieuwe gebruikers en wachtwoord-reset links
- Werkt via een API key — geen SMTP-configuratie nodig (native Supabase integratie)
- Verstuurt vanuit `noreply@byggr.nl`

**Waarom dit:** Native integratie met Supabase (API key invullen, klaar), gratis tier ruim voldoende, eenvoudige DNS-verificatie via Cloudflare.

**Invloed op de app:** Alleen bij uitnodigen en wachtwoord vergeten. App werkt normaal als Resend down is — alleen die twee acties mislukken.

**Kosten:** Gratis (Free tier) — 3.000 e-mails/maand, 100/dag.

**Status:** ⬜ Nog in te stellen — account aanmaken + `byggr.nl` verifiëren + Supabase koppelen.

**Configuratie:** Supabase dashboard → Auth → SMTP Settings → Resend API key invullen.

---

## Zoho Mail

**Wat het is:** E-maildienst voor zakelijke communicatie vanuit Byggr.

**Wat het doet:**
- Beheert het zakelijke e-mailadres `hello@byggr.nl`
- Verstuurt en ontvangt klantcommunicatie, offertes en projectupdates
- Geen directe koppeling met de app — losststaand van de technische stack

**Invloed op de app:** Geen — Zoho Mail is alleen voor zakelijke communicatie. Als Zoho down is, werkt de app gewoon door.

**Kosten:** Gratis (Free tier) — 1 gebruiker, 5 GB opslag.

**E-mailadres:** hello@byggr.nl

---

## React

**Wat het is:** Het JavaScript-framework waarmee de gebruikersinterface is gebouwd.

**Wat het doet:**
- Bouwt de UI op uit componenten (Planning, Projecten, Monteurs, Overzicht)
- Beheert state (wat er zichtbaar is, welke data geladen is)
- Reageert op gebruikersacties (klikken, filteren, inplannen)

**Kosten:** Gratis, open source.

---

## Tailwind CSS

**Wat het is:** Een CSS-framework voor de opmaak van de app.

**Wat het doet:**
- Verzorgt alle visuele stijl via utility-klassen direct in de HTML/JSX
- Geen aparte CSS-bestanden per component

**Kosten:** Gratis, open source.

---

## Vite

**Wat het is:** De build-tool die de broncode omzet naar een bundel die de browser begrijpt.

**Wat het doet:**
- Start de lokale ontwikkelserver (`npm run dev`)
- Bouwt de productie-bundel (`npm run build`) — resultaat wordt door Vercel gepubliceerd
- Leest `.env.local` voor lokale environment variables

**Kosten:** Gratis, open source.

---

## Overzicht afhankelijkheden

| Dienst     | Kritiek | Kosten nu | Upgrade nodig bij         |
|------------|---------|-----------|---------------------------|
| Supabase   | Ja      | Gratis    | Eerste betalende klant    |
| Vercel     | Ja      | Gratis    | Hoog verkeersvolume       |
| GitHub     | Nee     | Gratis    | Waarschijnlijk nooit      |
| Sentry     | Nee     | Gratis    | Waarschijnlijk nooit      |
| Resend     | Deels   | Gratis    | > 3.000 mails/maand       |
| Zoho Mail  | Nee     | Gratis    | > 1 gebruiker / 5 GB      |
| React      | n.v.t.  | Gratis    | n.v.t.                    |
| Tailwind   | n.v.t.  | Gratis    | n.v.t.                    |
| Vite       | n.v.t.  | Gratis    | n.v.t.                    |
