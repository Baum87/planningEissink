# Backup strategie — planning_app

## Principes

- Vóór elke migratie een handmatige dump maken
- Bij eerste betalende klant: Supabase Pro overwegen (dagelijkse backups + PITR)
- Backups bewaren buiten Supabase (lokaal of cloud storage)

---

## Handmatige dump vóór een migratie

### Optie A — Supabase CLI (aanbevolen)

```bash
# Eenmalig installeren (als nog niet gedaan)
brew install supabase/tap/supabase

# Inloggen
supabase login

# Dump maken van planning_app (verander PROJECT_REF naar jouw project-id uit .env of dashboard)
supabase db dump --project-ref <PROJECT_REF> -f backup_$(date +%Y%m%d).sql

# Met data (schema + inhoud)
supabase db dump --project-ref <PROJECT_REF> --data-only -f backup_data_$(date +%Y%m%d).sql
```

Bewaar het bestand lokaal (bijv. in een `backups/` map buiten de repo) of upload naar Google Drive.

### Optie B — Supabase dashboard

1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard) → planning_app
2. Settings → Database → Backups
3. Op de free tier: geen automatische backups — alleen handmatig via CLI
4. Pro tier: dagelijkse backups beschikbaar + Point-in-Time Recovery (PITR)

---

## Checklist vóór elke migratie

- [ ] Dump gemaakt met datum in bestandsnaam
- [ ] Bestand opgeslagen buiten de repo
- [ ] Migratie lokaal getest (indien staging beschikbaar)
- [ ] Migratie uitvoerbaar via Supabase SQL-editor of CLI

---

## Bij eerste betalende klant

Upgrade naar **Supabase Pro** ($25/maand):
- Dagelijkse automatische backups (7 dagen retentie)
- Point-in-Time Recovery (PITR) — herstel tot op de minuut
- Geen pauzering van de database bij inactiviteit

---

## Huidige situatie (mei 2026)

- Free tier — geen automatische backups
- Tenant Eissink live op planning_app
- Handmatige dump uitvoeren vóór iedere SQL-migratie
